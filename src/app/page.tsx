import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold tracking-tight">AgentNumber</span>
        <div className="flex gap-6 items-center text-sm">
          <a href="#docs" className="text-muted hover:text-foreground transition-colors">
            DOCS
          </a>
          <a href="#pricing" className="text-muted hover:text-foreground transition-colors">
            PRICING
          </a>
          <Link href="/login" className="text-muted hover:text-foreground transition-colors">
            LOG IN
          </Link>
          <Link
            href="/signup"
            className="bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            GET STARTED
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
              Phone Numbers
              <br />
              for AI Agents
            </h1>
            <p className="mt-6 text-lg text-muted max-w-lg">
              AgentNumber is the phone API for AI agents. It gives agents real
              phone numbers with built-in speech-to-text and text-to-speech,
              like Twilio does for humans.
            </p>
            <div className="flex gap-4 mt-8">
              <Link
                href="/signup"
                className="bg-foreground text-background text-base font-medium px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                GET STARTED
              </Link>
              <a
                href="#docs"
                className="border border-border text-foreground text-base font-medium px-6 py-3 rounded-xl hover:border-zinc-500 transition-colors"
              >
                DOCS
              </a>
            </div>
          </div>

          {/* Code example - right side */}
          <div className="rounded-2xl border border-border bg-zinc-900/80 overflow-hidden">
            <div className="flex border-b border-border">
              <span className="text-xs font-medium px-4 py-2.5 border-b-2 border-accent text-foreground">cURL</span>
              <span className="text-xs font-medium px-4 py-2.5 text-muted">Python</span>
              <span className="text-xs font-medium px-4 py-2.5 text-muted">TypeScript</span>
            </div>
            <div className="p-5">
              <pre className="text-sm leading-relaxed overflow-x-auto">
<span className="text-blue-400">curl</span>{" -X POST "}<span className="text-green-400">https://agentnumber.com/api/v0/numbers</span>{` \\
  `}<span className="text-zinc-500">-H</span>{` "Authorization: Bearer an_live_..." \\
  `}<span className="text-zinc-500">-H</span>{` "Content-Type: application/json" \\
  `}<span className="text-zinc-500">-d</span>{` '`}<span className="text-yellow-300">{`{
    "system_prompt": "You are a helpful assistant."
  }`}</span>{`'`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture diagram */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-border bg-zinc-900/50 p-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
            <div className="bg-zinc-800 border border-border rounded-xl px-6 py-4 text-center min-w-28">
              <div className="text-muted text-xs mb-1">Caller</div>
              <div className="font-semibold">Phone</div>
            </div>
            <div className="text-muted text-xs hidden sm:block">&mdash;&mdash;&rarr;</div>
            <div className="text-muted sm:hidden">&darr;</div>
            <div className="bg-zinc-800 border border-accent/30 rounded-xl px-6 py-4 text-center min-w-28">
              <div className="text-accent text-xs mb-1">AgentNumber</div>
              <div className="font-semibold">STT + TTS</div>
            </div>
            <div className="text-muted text-xs hidden sm:block">&mdash;&mdash;&rarr;</div>
            <div className="text-muted sm:hidden">&darr;</div>
            <div className="bg-accent/10 border border-accent/40 rounded-xl px-6 py-4 text-center min-w-28">
              <div className="text-accent text-xs mb-1">Your webhook</div>
              <div className="font-semibold">Your Agent</div>
            </div>
          </div>
          <p className="text-muted text-xs text-center mt-5">
            Caller speaks &rarr; AgentNumber transcribes (STT) &rarr; POSTs text to your webhook &rarr; your agent responds &rarr; AgentNumber speaks it (TTS)
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* DOCS — this is the section agents will read */}
      {/* ============================================================ */}
      <section id="docs" className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-2">API Documentation</h2>
        <p className="text-muted mb-10">Base URL: <code className="text-accent text-sm">https://agentnumber.com/api/v0</code></p>

        {/* Auth */}
        <DocSection title="Authentication">
          <p className="text-sm text-muted mb-3">
            All API requests require a Bearer token. Get your API key from the dashboard after signing up.
          </p>
          <CodeBlock>{`Authorization: Bearer an_live_<your_key>`}</CodeBlock>
        </DocSection>

        {/* Quick Start */}
        <DocSection title="Quick Start">
          <p className="text-sm text-muted mb-4">
            Three steps to give your agent a phone number:
          </p>
          <ol className="space-y-6 text-sm">
            <li>
              <StepLabel n={1} text="Sign up and create an API key" />
              <p className="text-muted mt-1 ml-8">
                Sign up at <code className="text-accent">/signup</code>, then create an API key in the dashboard.
              </p>
            </li>
            <li>
              <StepLabel n={2} text="Add credits" />
              <CodeBlock title="POST /credits/purchase">{`{
  "amount_cents": 1000
}`}</CodeBlock>
              <p className="text-muted mt-2 ml-8">$5 per number, $0.05/min outbound, $0.03/min inbound.</p>
            </li>
            <li>
              <StepLabel n={3} text="Provision a phone number" />
              <p className="text-muted mt-2 ml-8 mb-3">
                <strong className="text-foreground">Option A: Managed mode</strong> — just provide a system prompt, no server needed:
              </p>
              <CodeBlock title="POST /numbers (managed)">{`{
  "system_prompt": "You are a helpful sales assistant for Acme Corp.",
  "first_message": "Hello, how can I help you?",
  "area_code": "415"
}`}</CodeBlock>
              <p className="text-muted mt-4 ml-8 mb-3">
                <strong className="text-foreground">Option B: Webhook mode</strong> — route calls to your own server for full control:
              </p>
              <CodeBlock title="POST /numbers (webhook)">{`{
  "webhook_url": "https://your-agent.com/voice",
  "area_code": "415"
}`}</CodeBlock>
              <p className="text-muted mt-2 ml-8">
                Managed mode: we handle the LLM — your agent gets a number in one API call. Webhook mode: calls are routed to your server in OpenAI chat completions format.
              </p>
            </li>
          </ol>
        </DocSection>

        {/* Webhook format */}
        <DocSection title="Webhook Format">
          <p className="text-sm text-muted mb-3">
            Your <code className="text-accent">webhook_url</code> receives POST requests in OpenAI-compatible chat completions format:
          </p>
          <CodeBlock title="POST to your webhook_url">{`{
  "model": "custom",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hi, I'd like to schedule an appointment." }
  ],
  "stream": true
}`}</CodeBlock>
          <p className="text-sm text-muted mt-3">
            Respond with SSE-streamed chat completion chunks (same format as OpenAI). The text content is spoken back to the caller via TTS.
          </p>
          <CodeBlock title="Your response (SSE stream)">{`data: {"choices":[{"delta":{"content":"Sure, I can"}}]}

data: {"choices":[{"delta":{"content":" help with that."}}]}

data: [DONE]`}</CodeBlock>
        </DocSection>

        {/* Numbers API */}
        <DocSection title="Numbers API">
          <EndpointBlock method="POST" path="/numbers" desc="Provision a new phone number">
            <CodeBlock title="Request body">{`{
  "system_prompt": "You are a helpful assistant.",  // managed mode (OR webhook_url)
  "webhook_url": "https://your-agent.com/voice",   // webhook mode (OR system_prompt)
  "area_code": "415",                               // optional, default "941"
  "voice_id": "cgSgspJ2msm6clMCkdW9",              // optional, ElevenLabs voice
  "first_message": "Hello!",                        // optional, spoken on pickup
  "inbound_mode": "autopilot",                      // optional
  "metadata": {}                                    // optional, your custom data
}`}</CodeBlock>
            <CodeBlock title="Response 201">{`{
  "success": true,
  "data": {
    "id": "num_a1b2c3d4e5f6",
    "phone_number": "+14155551234",
    "webhook_url": "https://your-agent.com/voice",
    "voice_id": "cgSgspJ2msm6clMCkdW9",
    "first_message": "Hello!",
    "inbound_mode": "autopilot",
    "metadata": {},
    "status": "active",
    "created_at": "2026-03-05T12:00:00Z"
  }
}`}</CodeBlock>
          </EndpointBlock>

          <EndpointBlock method="GET" path="/numbers" desc="List all your phone numbers" />

          <EndpointBlock method="GET" path="/numbers/:id" desc="Get a specific number" />

          <EndpointBlock method="PATCH" path="/numbers/:id" desc="Update number config (webhook_url, voice_id, first_message, metadata)">
            <CodeBlock title="Request body">{`{
  "webhook_url": "https://new-agent.com/voice"
}`}</CodeBlock>
          </EndpointBlock>

          <EndpointBlock method="DELETE" path="/numbers/:id" desc="Release a phone number" />
        </DocSection>

        {/* Calls API */}
        <DocSection title="Calls API">
          <EndpointBlock method="POST" path="/calls" desc="Make an outbound call">
            <CodeBlock title="Request body">{`{
  "from": "num_a1b2c3d4e5f6",     // your number ID
  "to": "+15551234567",            // destination E.164
  "metadata": {}                   // optional
}`}</CodeBlock>
          </EndpointBlock>

          <EndpointBlock method="GET" path="/calls" desc="List call history (supports ?limit=&offset= pagination)" />

          <EndpointBlock method="GET" path="/calls/:id" desc="Get call details (status, duration, cost)" />

          <EndpointBlock method="GET" path="/calls/:id/transcript" desc="Get call transcript" />

          <EndpointBlock method="GET" path="/calls/:id/recording" desc="Get recording URL" />
        </DocSection>

        {/* Credits API */}
        <DocSection title="Credits API">
          <EndpointBlock method="GET" path="/credits/balance" desc="Check your credit balance">
            <CodeBlock title="Response">{`{
  "success": true,
  "data": {
    "balance_cents": 1500,
    "balance_dollars": "15.00"
  }
}`}</CodeBlock>
          </EndpointBlock>

          <EndpointBlock method="POST" path="/credits/purchase" desc="Purchase credits (x402 USDC payment — $10.00 per pack)" />
        </DocSection>

        {/* Webhooks API */}
        <DocSection title="Webhooks API">
          <p className="text-sm text-muted mb-3">
            Register webhooks to receive events. Payloads are HMAC-signed with your secret.
          </p>
          <EndpointBlock method="POST" path="/webhooks" desc="Register a webhook">
            <CodeBlock title="Request body">{`{
  "url": "https://your-server.com/hooks",
  "events": ["call.ended", "call.transcript.ready", "call.recording.ready"]
}`}</CodeBlock>
            <CodeBlock title="Response (secret shown once)">{`{
  "success": true,
  "data": {
    "id": "wh_abc123",
    "url": "https://your-server.com/hooks",
    "events": ["call.ended", "call.transcript.ready", "call.recording.ready"],
    "secret": "whsec_...",
    "active": true
  }
}`}</CodeBlock>
          </EndpointBlock>

          <EndpointBlock method="GET" path="/webhooks" desc="List webhooks" />
          <EndpointBlock method="PATCH" path="/webhooks/:id" desc="Update webhook (url, events, active)" />
          <EndpointBlock method="DELETE" path="/webhooks/:id" desc="Delete a webhook" />

          <div className="mt-4">
            <p className="text-xs text-muted mb-2">Available events:</p>
            <div className="flex flex-wrap gap-2">
              {["call.started", "call.ended", "call.transcript.ready", "call.recording.ready"].map(e => (
                <code key={e} className="text-xs bg-zinc-800 text-accent px-2 py-1 rounded">{e}</code>
              ))}
            </div>
          </div>
        </DocSection>

        {/* Error format */}
        <DocSection title="Error Format">
          <CodeBlock title="Error response">{`{
  "success": false,
  "error": {
    "message": "Insufficient credits. Need 500 cents, have 0 cents.",
    "code": "insufficient_credits"
  }
}`}</CodeBlock>
          <div className="mt-3 space-y-1 text-xs text-muted">
            <p><code className="text-foreground">401</code> — Invalid or missing API key</p>
            <p><code className="text-foreground">400</code> — Validation error</p>
            <p><code className="text-foreground">402</code> — Insufficient credits</p>
            <p><code className="text-foreground">404</code> — Resource not found</p>
            <p><code className="text-foreground">500</code> — Internal error</p>
          </div>
        </DocSection>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Simple pricing</h2>
        <p className="text-muted mb-8">No subscriptions. Pay as you go.</p>
        <div className="rounded-2xl border border-border bg-zinc-900/50 p-8 text-left">
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
            <p className="text-xs text-muted text-center">
              Credits purchased via USDC (x402 protocol) or dashboard. Minimum $10.
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
          className="inline-block bg-foreground text-background text-lg font-medium px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
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

/* ============================================================
   Docs helper components
   ============================================================ */

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12 border-b border-border pb-10 last:border-0">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function CodeBlock({ title, children }: { title?: string; children: string }) {
  return (
    <div className="rounded-xl bg-zinc-900/80 border border-border overflow-hidden my-3">
      {title && (
        <div className="px-4 py-2 border-b border-border text-xs text-muted">{title}</div>
      )}
      <pre className="p-4 text-sm text-green-400 overflow-x-auto whitespace-pre">{children}</pre>
    </div>
  );
}

function EndpointBlock({
  method,
  path,
  desc,
  children,
}: {
  method: string;
  path: string;
  desc: string;
  children?: React.ReactNode;
}) {
  const methodColor: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-400",
    POST: "bg-green-500/20 text-green-400",
    PATCH: "bg-yellow-500/20 text-yellow-400",
    DELETE: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="my-4">
      <div className="flex items-center gap-3 mb-1">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${methodColor[method] || "bg-zinc-500/20 text-zinc-400"}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted ml-14 mb-2">{desc}</p>
      {children && <div className="ml-14">{children}</div>}
    </div>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">
        {n}
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}
