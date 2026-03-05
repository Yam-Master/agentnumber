import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold tracking-tight">AgentNumber</span>
        <div className="flex gap-4 items-center">
          <Link
            href="/login"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
          Give your agent
          <br />
          <span className="text-accent-light">a phone number</span>
        </h1>
        <p className="mt-6 text-lg text-muted max-w-2xl mx-auto">
          One API call. Your AI agent gets a real phone number with
          speech-to-text and text-to-speech built in. You bring the brain, we
          handle the voice.
        </p>
        <div className="flex gap-4 justify-center mt-10">
          <Link
            href="/signup"
            className="bg-accent hover:bg-accent-light text-white text-lg font-medium px-8 py-3 rounded-xl transition-colors"
          >
            Get started
          </Link>
          <a
            href="#how-it-works"
            className="border border-border hover:border-zinc-500 text-foreground text-lg font-medium px-8 py-3 rounded-xl transition-colors"
          >
            How it works
          </a>
        </div>
      </section>

      {/* Code example */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-border bg-zinc-900/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="text-xs text-muted ml-2">provision a number</span>
          </div>
          <pre className="text-sm text-green-400 overflow-x-auto">
{`curl -X POST https://agentnumber.com/api/v0/numbers \\
  -H "Authorization: Bearer an_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_url": "https://your-agent.com/voice",
    "area_code": "415"
  }'`}
          </pre>
          <pre className="text-sm text-zinc-400 mt-4 overflow-x-auto">
{`{
  "id": "num_a1b2c3d4",
  "phone_number": "+14155551234",
  "webhook_url": "https://your-agent.com/voice",
  "status": "active"
}`}
          </pre>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-muted text-center mb-12 max-w-xl mx-auto">
          Your agent already has a brain. We give it a voice and a phone number.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Get a number",
              desc: "Provision a real US phone number via API. Choose your area code.",
            },
            {
              step: "2",
              title: "Point to your agent",
              desc: "Set your webhook URL. We send transcribed speech, your agent responds with text.",
            },
            {
              step: "3",
              title: "Calls just work",
              desc: "Inbound and outbound. We handle STT and TTS. Your agent handles the conversation.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-accent/20 text-accent-light font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-muted text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border bg-zinc-900/50 p-8">
          <h2 className="text-2xl font-bold text-center mb-8">The voice pipeline</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <div className="bg-zinc-800 border border-border rounded-xl px-5 py-3 text-center">
              <div className="text-muted text-xs mb-1">Caller</div>
              <div className="font-semibold">Phone</div>
            </div>
            <span className="text-muted hidden sm:block">&rarr;</span>
            <span className="text-muted sm:hidden">&darr;</span>
            <div className="bg-zinc-800 border border-border rounded-xl px-5 py-3 text-center">
              <div className="text-muted text-xs mb-1">AgentNumber</div>
              <div className="font-semibold">STT + TTS</div>
            </div>
            <span className="text-muted hidden sm:block">&rarr;</span>
            <span className="text-muted sm:hidden">&darr;</span>
            <div className="bg-accent/20 border border-accent/40 rounded-xl px-5 py-3 text-center">
              <div className="text-accent-light text-xs mb-1">Your server</div>
              <div className="font-semibold">Your Agent</div>
            </div>
          </div>
          <p className="text-muted text-xs text-center mt-6">
            Caller speaks &rarr; we transcribe &rarr; your agent thinks &rarr; we speak the response
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Built for agents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            {
              title: "Framework agnostic",
              desc: "OpenAI, Anthropic, LangChain, custom — if it responds to HTTP, it works.",
            },
            {
              title: "Real phone numbers",
              desc: "US numbers with any area code. Inbound and outbound calling.",
            },
            {
              title: "Pay with USDC",
              desc: "x402 protocol. Your agent pays on-chain, no credit cards needed.",
            },
            {
              title: "Webhooks",
              desc: "Get notified on call events, transcripts, and recordings via HMAC-signed webhooks.",
            },
            {
              title: "Call history API",
              desc: "Full transcripts, recordings, duration, and cost tracking per call.",
            },
            {
              title: "Sub-second latency",
              desc: "Streaming STT/TTS pipeline for real-time, natural conversations.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-zinc-900/50 p-5"
            >
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
        <p className="text-muted mb-8">No subscriptions. Pay as you go.</p>
        <div className="rounded-2xl border border-border bg-zinc-900/50 p-8">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Phone number</span>
              <span className="font-medium">$5.00 / number</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Outbound calls</span>
              <span className="font-medium">$0.05 / min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Inbound calls</span>
              <span className="font-medium">$0.03 / min</span>
            </div>
          </div>
          <div className="border-t border-border mt-6 pt-6">
            <p className="text-xs text-muted">
              Credits purchased via USDC (x402). Minimum purchase $10.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Your agent deserves a voice</h2>
        <p className="text-muted mb-8">
          Get a phone number in one API call. Start building today.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-accent hover:bg-accent-light text-white text-lg font-medium px-8 py-3 rounded-xl transition-colors"
        >
          Get started
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        AgentNumber &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
