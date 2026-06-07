// Aletheia – Research Agent API Route
// Orchestrates: Planning → Tool Execution → Evaluation → Synthesis

import { NextResponse } from 'next/server';
import Groq from 'groq-sdk'; // we'll add this to package.json later

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ---------- Tool: DuckDuckGo Instant Answer ----------
async function duckSearch(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url);
  const data = await res.json();
  // Extract snippets from RelatedTopics and Abstract
  let snippets = [];
  if (data.AbstractText) snippets.push(data.AbstractText);
  if (data.RelatedTopics) {
    data.RelatedTopics.forEach(topic => {
      if (topic.Text) snippets.push(topic.Text);
    });
  }
  // Return a set of unique snippets
  return [...new Set(snippets)].slice(0, 5);
}

// ---------- Credibility Scoring ----------
function scoreSource(sourceText, sourcesArray) {
  // Simple heuristic: longer text often more detailed (not perfect but works for MVP)
  const lengthScore = Math.min(sourceText.length / 200, 1) * 0.4;
  // Cross-reference: how many other sources share similar phrases? (basic)
  let crossScore = 0;
  sourcesArray.forEach(other => {
    if (other !== sourceText && sourceText.includes(other.slice(0, 30))) {
      crossScore += 0.3;
    }
  });
  const total = lengthScore + crossScore;
  if (total > 0.7) return { badge: '🟢 High', score: total };
  if (total > 0.4) return { badge: '🟡 Medium', score: total };
  return { badge: '🔴 Low', score: total };
}

// ---------- POST handler ----------
export async function POST(request) {
  try {
    const { question } = await request.json();
    if (!question) return NextResponse.json({ error: 'No question' }, { status: 400 });

    // ---- Phase 1: Planning (Groq) ----
    const planPrompt = `You are an autonomous research planner. Break the user's question into 2-4 specific sub-questions. For each, suggest a search query.
Return JSON array like: [{"sub_question":"...", "search_query":"..."}]`;

    const planCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: planPrompt },
        { role: 'user', content: question }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
    });
    const planText = planCompletion.choices[0]?.message?.content || '[]';
    // Parse plan (handle possible markdown code block)
    const jsonPlan = planText.replace(/```json|```/g, '').trim();
    const plan = JSON.parse(jsonPlan);

    // ---- Phase 2: Execution (search each sub-question) ----
    const researchData = await Promise.all(plan.map(async (item) => {
      const snippets = await duckSearch(item.search_query);
      const sources = snippets.map(s => ({ text: s, credibility: null }));
      return { sub_question: item.sub_question, search_query: item.search_query, sources };
    }));

    // ---- Phase 3: Credibility Evaluation ----
    const allTexts = researchData.flatMap(d => d.sources.map(s => s.text));
    researchData.forEach(data => {
      data.sources.forEach(source => {
        source.credibility = scoreSource(source.text, allTexts);
      });
    });

    // ---- Phase 4: Contradiction Detection (simple keyword overlap difference) ----
    const contradictions = [];
    // Just compare pairs across different sub-questions for demonstration
    for (let i = 0; i < researchData.length; i++) {
      for (let j = i+1; j < researchData.length; j++) {
        const textsA = researchData[i].sources.map(s => s.text).join(' ');
        const textsB = researchData[j].sources.map(s => s.text).join(' ');
        // Very naive: if they share many words but credibility differs, flag
        const wordsA = new Set(textsA.toLowerCase().split(/\s+/));
        const wordsB = new Set(textsB.toLowerCase().split(/\s+/));
        const common = [...wordsA].filter(w => wordsB.has(w)).length;
        if (common > 20) {
          // Check if any source in one has high cred and the other low cred
          const highCredA = researchData[i].sources.some(s => s.credibility.badge === '🟢 High');
          const lowCredB = researchData[j].sources.some(s => s.credibility.badge === '🔴 Low');
          if (highCredA && lowCredB) {
            contradictions.push({
              topic: `${researchData[i].sub_question} vs ${researchData[j].sub_question}`,
              note: 'Potential contradiction: high-credibility sources in one area conflict with low-credibility claims in another.'
            });
          }
        }
      }
    }

    // ---- Phase 5: Synthesis (Groq) ----
    const synthesisPrompt = `Summarize the research findings into a structured report. Include:
- Executive Summary
- Key Findings (with confidence levels)
- Areas of Disagreement
Use the provided data. The data: ${JSON.stringify(researchData, null, 2)}`;

    const synthCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: synthesisPrompt },
        { role: 'user', content: question }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
    });
    const reportText = synthCompletion.choices[0]?.message?.content || 'Report unavailable';

    // ---- Build final response ----
    const responsePayload = {
      question,
      plan,
      research_data: researchData,
      contradictions,
      report: reportText,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
