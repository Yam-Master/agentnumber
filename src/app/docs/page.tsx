import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold tracking-tight">AgentNumber</Link>
        <div className="flex gap-6 items-center text-sm">
          <Link href="/" className="text-muted hover:text-foreground transition-colors">HOME</Link>
          <Link href="/login" className="text-muted hover:text-foreground transition-colors">LOG IN</Link>
          <Link href="/signup" className="bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium">
            GET STARTED
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-2">API Documentation</h2>
        <p className="text-muted mb-10">Base URL: <code className="text-accent text-sm">https://agentnumber.com/api/v0</code></p>

        <DocSection title="Authentication">
          <p className="text-sm text-muted mb-3">
            All API requests require a Bearer token. Get your API key from the dashboard after signing up.
          </p>
          <CodeBlock>{`Authorization: Bearer an_live_<your_key>`}</CodeBlock>
        </DocSection>

        <DocSection title="Quick Start">
          <p className="text-sm text-muted mb-4">Three steps to give your agent a phone number:</p>
          <ol className="space-y-6 text-sm">
            <li>
              <StepLabel n={1} text="Sign up and create an API key" />
              <p className="text-muted mt-1 ml-8">Sign up at <code className="text-accent">/signup</code>, then create an API key in the dashboard.</p>
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

        <DocSection title="Calls API">
          <EndpointBlock method="POST" path="/calls" desc="Make an outbound call">
            <CodeBlock title="Request body">{`{
  "from": "num_a1b2c3d4e5f6",
  "to": "+15551234567",
  "metadata": {}
}`}</CodeBlock>
          </EndpointBlock>
          <EndpointBlock method="GET" path="/calls" desc="List call history (supports ?limit=&offset= pagination)" />
          <EndpointBlock method="GET" path="/calls/:id" desc="Get call details (status, duration, cost)" />
          <EndpointBlock method="GET" path="/calls/:id/transcript" desc="Get call transcript" />
          <EndpointBlock method="GET" path="/calls/:id/recording" desc="Get recording URL" />
        </DocSection>

        <DocSection title="SMS API">
          <EndpointBlock method="POST" path="/sms" desc="Send an outbound SMS">
            <CodeBlock title="Request body">{`{
  "from": "num_a1b2c3d4e5f6",
  "to": "+15551234567",
  "body": "Hello from my agent!",
  "metadata": {}
}`}</CodeBlock>
            <CodeBlock title="Response 201">{`{
  "success": true,
  "data": {
    "id": "msg_a1b2c3d4e5f6",
    "from": "+14155551234",
    "to": "+15551234567",
    "direction": "outbound",
    "body": "Hello from my agent!",
    "status": "sent",
    "cost_cents": 2,
    "metadata": {},
    "created_at": "2026-03-05T12:00:00Z"
  }
}`}</CodeBlock>
          </EndpointBlock>
          <EndpointBlock method="GET" path="/sms" desc="List SMS messages (supports ?number_id=&direction=&limit=&offset=)" />
          <EndpointBlock method="GET" path="/sms/:id" desc="Get a single SMS message" />
        </DocSection>

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

        <DocSection title="Webhooks API">
          <p className="text-sm text-muted mb-3">Register webhooks to receive events. Payloads are HMAC-signed with your secret.</p>
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
              {["call.started", "call.ended", "call.transcript.ready", "call.recording.ready", "sms.sent", "sms.received"].map(e => (
                <code key={e} className="text-xs bg-zinc-800 text-accent px-2 py-1 rounded">{e}</code>
              ))}
            </div>
          </div>
        </DocSection>

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

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        AgentNumber &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

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
      {title && <div className="px-4 py-2 border-b border-border text-xs text-muted">{title}</div>}
      <pre className="p-4 text-sm text-green-400 overflow-x-auto whitespace-pre">{children}</pre>
    </div>
  );
}

function EndpointBlock({ method, path, desc, children }: { method: string; path: string; desc: string; children?: React.ReactNode }) {
  const methodColor: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-400",
    POST: "bg-green-500/20 text-green-400",
    PATCH: "bg-yellow-500/20 text-yellow-400",
    DELETE: "bg-red-500/20 text-red-400",
  };
  return (
    <div className="my-4">
      <div className="flex items-center gap-3 mb-1">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${methodColor[method] || "bg-zinc-500/20 text-zinc-400"}`}>{method}</span>
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
      <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">{n}</div>
      <span className="font-medium">{text}</span>
    </div>
  );
}
