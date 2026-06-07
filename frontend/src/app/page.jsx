export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="font-heading text-6xl font-bold text-insight mb-4">
        Aletheia
      </h1>
      <p className="text-xl text-text-main/80 mb-8 max-w-md text-center">
        See the truth unfold.<br />
        An autonomous agent that researches, cross‑checks, and builds transparent reports.
      </p>
      <a
        href="/dashboard"
        className="rounded-lg bg-insight px-8 py-3 font-semibold text-navy transition hover:bg-amber"
      >
        Try It Now
      </a>
    </main>
  )
}
