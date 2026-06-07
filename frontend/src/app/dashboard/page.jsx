'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('idle'); // idle, planning, searching, analyzing, done

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setStep('planning');
    try {
      // Simulate phase transitions with timeouts for visual effect
      setTimeout(() => setStep('searching'), 1500);
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTimeout(() => setStep('analyzing'), 1000);
      setTimeout(() => {
        setResult(data);
        setStep('done');
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      setResult({ error: error.message });
      setStep('error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-heading font-bold text-insight mb-4">Aletheia Dashboard</h1>
        <p className="text-text-main/60 mb-8">Ask a complex question and see the truth unfold.</p>

        <form onSubmit={handleSubmit} className="flex gap-4 mb-12">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Is nuclear energy safer than fossil fuels?"
            className="flex-1 px-6 py-4 rounded-xl bg-surface border border-insight/20 text-text-main placeholder-text-main/30 focus:outline-none focus:ring-2 focus:ring-insight"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-insight text-navy font-bold rounded-xl hover:bg-amber transition disabled:opacity-50"
          >
            {loading ? 'Researching...' : 'Research'}
          </button>
        </form>

        {/* Progress Animation */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-10"
            >
              <div className="flex items-center space-x-4 text-lg">
                <span className={`font-semibold ${step === 'planning' ? 'text-insight' : 'text-text-main/40'}`}>
                  🧠 Planning
                </span>
                <span className="text-text-main/20">→</span>
                <span className={`font-semibold ${step === 'searching' ? 'text-insight' : 'text-text-main/40'}`}>
                  🔍 Searching
                </span>
                <span className="text-text-main/20">→</span>
                <span className={`font-semibold ${step === 'analyzing' ? 'text-insight' : 'text-text-main/40'}`}>
                  ⚖️ Analyzing
                </span>
                <span className="text-text-main/20">→</span>
                <span className={`font-semibold ${step === 'done' ? 'text-amber' : 'text-text-main/40'}`}>
                  📋 Report Ready
                </span>
              </div>
              <div className="mt-4 w-full bg-surface rounded-full h-2">
                <motion.div
                  className="h-full bg-insight rounded-full"
                  initial={{ width: '0%' }}
                  animate={{
                    width:
                      step === 'planning' ? '25%' :
                      step === 'searching' ? '50%' :
                      step === 'analyzing' ? '75%' : '100%'
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {result?.error && (
          <div className="bg-red-900/30 p-6 rounded-xl border border-red-400 text-red-200">
            Error: {result.error}
          </div>
        )}

        {/* Results */}
        {result && !result.error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
            {/* Report Section */}
            <div className="bg-surface rounded-2xl p-6 md:p-8 mb-8 shadow-2xl">
              <h2 className="text-2xl font-heading font-bold text-amber mb-6">📋 Research Report</h2>
              <div className="prose prose-invert max-w-none text-text-main whitespace-pre-line">
                {result.report}
              </div>
            </div>

            {/* Sources & Credibility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {result.research_data.map((item, idx) => (
                <div key={idx} className="bg-surface p-5 rounded-xl border border-insight/10">
                  <h3 className="font-semibold text-insight mb-3">{item.sub_question}</h3>
                  {item.sources.slice(0, 3).map((source, i) => (
                    <div key={i} className="mb-3 pb-3 border-b border-text-main/10 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-1 rounded-full bg-navy">
                          {source.credibility.badge}
                        </span>
                      </div>
                      <p className="text-sm text-text-main/80">{source.text}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Contradictions */}
            {result.contradictions.length > 0 && (
              <div className="bg-amber/5 p-6 rounded-xl border border-amber/30 mb-8">
                <h3 className="text-xl font-heading font-bold text-amber mb-3">⚠️ Contradictions Detected</h3>
                {result.contradictions.map((c, i) => (
                  <div key={i} className="mb-2 p-2 bg-navy rounded">
                    <span className="font-semibold">{c.topic}:</span> {c.note}
                  </div>
                ))}
              </div>
            )}

            {/* Raw JSON (expandable) for judges who want tech depth */}
            <details className="mt-8 bg-surface/50 p-4 rounded-lg">
              <summary className="cursor-pointer text-text-main/50 hover:text-insight">Technical Details (Raw JSON)</summary>
              <pre className="text-xs text-text-main/70 mt-4 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </motion.div>
        )}
      </div>
    </div>
  );
        }
