import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b-3 border-accent px-6 py-4 flex items-center justify-between bg-black">
        <Link href="/" className="text-sm font-bold tracking-widest uppercase">
          AGENT<span className="text-accent">[NUMBER]</span>
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/login" className="text-xs text-foreground hover:text-foreground transition-colors uppercase tracking-widest">Log In</Link>
          <Link href="/signup" className="bg-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-accent-dim transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold uppercase tracking-wider mb-2">API Documentation</h2>
        <p className="text-sm text-foreground mb-10 uppercase tracking-wider">
          Base URL: <code className="text-accent">https://agentnumber.com/api/v0</code>
        </p>

        <DocSection title="Authentication">
          <p className="text-sm text-foreground mb-3">
            All API requests require a Bearer token. Get your API key from the dashboard after signing up.
          </p>
          <CodeBlock>{`Authorization: Bearer an_live_<your_key>`}</CodeBlock>
        </DocSection>

        <DocSection title="Quick Start">
          <p className="text-sm text-foreground mb-4">Three steps to give your agent a phone number:</p>
          <ol className="space-y-6 text-sm">
            <li>
              <StepLabel n={1} text="Sign up and create an API key" />
              <p className="text-foreground mt-1 ml-8">Sign up at <code className="text-accent">/signup</code>, then create an API key in the dashboard.</p>
            </li>
            <li>
              <StepLabel n={2} text="Add credits" />
              <CodeBlock title="POST /credits/purchase">{`{
  "amount_cents": 1000
}`}</CodeBlock>
              <p className="text-foreground mt-2 ml-8">$5 per number, $0.05/min outbound, $0.03/min inbound.</p>
            </li>
            <li>
              <StepLabel n={3} text="Provision a phone number" />
              <p className="text-foreground mt-2 ml-8 mb-3">
                <strong className="text-foreground">Option A: Managed mode</strong> — just provide a system prompt, no server needed:
              </p>
              <CodeBlock title="POST /numbers (managed)">{`{
  "system_prompt": "You are a helpful sales assistant for Acme Corp.",
  "first_message": "Hello, how can I help you?",
  "area_code": "415"
}`}</CodeBlock>
              <p className="text-foreground mt-4 ml-8 mb-3">
                <strong className="text-foreground">Option B: Webhook mode</strong> — route calls to your own server for full control:
              </p>
              <CodeBlock title="POST /numbers (webhook)">{`{
  "webhook_url": "https://your-agent.com/voice",
  "area_code": "415"
}`}</CodeBlock>
            </li>
          </ol>
        </DocSection>

        <DocSection title="Webhook Format">
          <p className="text-sm text-foreground mb-3">
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
          <p className="text-sm text-foreground mt-3">
            Respond with SSE-streamed chat completion chunks. The text is spoken back via TTS.
          </p>
          <CodeBlock title="Your response (SSE stream)">{`data: {"choices":[{"delta":{"content":"Sure, I can"}}]}

data: {"choices":[{"delta":{"content":" help with that."}}]}

data: [DONE]`}</CodeBlock>
        </DocSection>

        <DocSection title="Numbers API">
          <EndpointBlock method="POST" path="/numbers" desc="Provision a new phone number">
            <CodeBlock title="Request body">{`{
  "system_prompt": "You are a helpful assistant.",
  "webhook_url": "https://your-agent.com/voice",
  "area_code": "415",
  "voice_id": "cgSgspJ2msm6clMCkdW9",
  "first_message": "Hello!",
  "inbound_mode": "autopilot",
  "metadata": {}
}`}</CodeBlock>
          </EndpointBlock>
          <EndpointBlock method="GET" path="/numbers" desc="List all your phone numbers" />
          <EndpointBlock method="GET" path="/numbers/:id" desc="Get a specific number" />
          <EndpointBlock method="PATCH" path="/numbers/:id" desc="Update number config" />
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
          <EndpointBlock method="GET" path="/calls" desc="List call history" />
          <EndpointBlock method="GET" path="/calls/:id" desc="Get call details" />
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
          </EndpointBlock>
          <EndpointBlock method="GET" path="/sms" desc="List SMS messages" />
          <EndpointBlock method="GET" path="/sms/:id" desc="Get a single SMS message" />
        </DocSection>

        <DocSection title="Credits API">
          <EndpointBlock method="GET" path="/credits/balance" desc="Check your credit balance" />
          <EndpointBlock method="POST" path="/credits/purchase" desc="Purchase credits ($10.00 per pack)" />
        </DocSection>

        <DocSection title="Webhooks API">
          <p className="text-sm text-foreground mb-3">Register webhooks to receive events. Payloads are HMAC-signed.</p>
          <EndpointBlock method="POST" path="/webhooks" desc="Register a webhook" />
          <EndpointBlock method="GET" path="/webhooks" desc="List webhooks" />
          <EndpointBlock method="PATCH" path="/webhooks/:id" desc="Update webhook" />
          <EndpointBlock method="DELETE" path="/webhooks/:id" desc="Delete a webhook" />
          <div className="mt-4">
            <p className="text-xs text-foreground mb-2 uppercase tracking-widest">Available Events:</p>
            <div className="flex flex-wrap gap-2">
              {["call.started", "call.ended", "call.transcript.ready", "call.recording.ready", "sms.sent", "sms.received"].map(e => (
                <code key={e} className="text-xs border border-border text-accent px-2 py-1">{e}</code>
              ))}
            </div>
          </div>
        </DocSection>

        <DocSection title="Error Format">
          <CodeBlock title="Error response">{`{
  "success": false,
  "error": {
    "message": "Insufficient credits.",
    "code": "insufficient_credits"
  }
}`}</CodeBlock>
          <div className="mt-3 space-y-1 text-xs text-foreground">
            <p><code className="text-foreground">401</code> — Invalid or missing API key</p>
            <p><code className="text-foreground">400</code> — Validation error</p>
            <p><code className="text-foreground">402</code> — Insufficient credits</p>
            <p><code className="text-foreground">404</code> — Resource not found</p>
            <p><code className="text-foreground">500</code> — Internal error</p>
          </div>
        </DocSection>
      </section>

      <footer className="border-t-3 border-border py-6 text-center text-xs text-foreground uppercase tracking-widest">
        AGENT[NUMBER] &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12 border-b-3 border-border pb-10 last:border-0">
      <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function CodeBlock({ title, children }: { title?: string; children: string }) {
  return (
    <div className="border-3 border-border overflow-hidden my-3">
      {title && <div className="px-4 py-2 border-b border-border text-xs text-foreground uppercase tracking-widest">{title}</div>}
      <pre className="p-4 text-sm text-accent overflow-x-auto whitespace-pre bg-black">{children}</pre>
    </div>
  );
}

function EndpointBlock({ method, path, desc, children }: { method: string; path: string; desc: string; children?: React.ReactNode }) {
  const methodColor: Record<string, string> = {
    GET: "border-foreground text-foreground",
    POST: "border-accent text-accent",
    PATCH: "border-foreground text-foreground",
    DELETE: "border-accent text-accent",
  };
  return (
    <div className="my-4">
      <div className="flex items-center gap-3 mb-1">
        <span className={`text-xs font-bold px-2 py-0.5 border-2 uppercase tracking-wider ${methodColor[method] || "border-muted text-foreground"}`}>{method}</span>
        <code className="text-sm text-foreground">{path}</code>
      </div>
      <p className="text-sm text-foreground ml-14 mb-2">{desc}</p>
      {children && <div className="ml-14">{children}</div>}
    </div>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 border-2 border-accent text-accent text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <span className="font-bold uppercase tracking-wider">{text}</span>
    </div>
  );
}
