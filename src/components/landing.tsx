"use client";

const CODE_SNIPPET = `import { payForResource } from "@x402/client";

// 1. Pay and provision a phone number
const res = await payForResource(
  "https://agentnumber.xyz/api/provision",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      areaCode: "415",
      systemPrompt: "You are a trading assistant...",
    }),
  },
  wallet // your Base wallet/signer
);

const { phoneNumber, assistantId, phoneNumberId } = await res.json();
// => { phoneNumber: "+14155551234", assistantId: "asst_...", phoneNumberId: "..." }`;

const CALL_SNIPPET = `// 2. Make an outbound call ($0.01 per call)
const callRes = await payForResource(
  "https://agentnumber.xyz/api/call",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phoneNumberId,
      assistantId,
      to: "+1234567890",
    }),
  },
  wallet
);`;

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent font-mono text-lg font-bold">
            AgentNumber
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted">
          <a href="#how" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#api" className="hover:text-foreground transition-colors">
            API
          </a>
          <a
            href="https://x402.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            x402
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-3xl w-full space-y-8">
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Give your agent
              <br />
              <span className="text-accent">a phone number.</span>
            </h1>
            <p className="text-xl text-muted max-w-lg">
              Voice + SMS. Pay with USDC. Under 5 minutes.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-delay">
            <FeatureCard
              title="x402 Payments"
              desc="Pay-per-use with USDC on Base. No subscriptions, no API keys to manage."
            />
            <FeatureCard
              title="Voice + SMS"
              desc="Real US phone numbers with inbound/outbound calling and SMS capabilities."
            />
            <FeatureCard
              title="Agent-Native"
              desc="JSON API. Your agent provisions its own number and makes calls programmatically."
            />
          </div>

          {/* Code */}
          <div id="api" className="space-y-6 animate-fade-in-delay-2">
            <h2 className="text-2xl font-bold">Provision a number</h2>
            <CodeBlock code={CODE_SNIPPET} />

            <h2 className="text-2xl font-bold">Make a call</h2>
            <CodeBlock code={CALL_SNIPPET} />
          </div>

          {/* How it works */}
          <div id="how" className="space-y-6 animate-fade-in-delay-3">
            <h2 className="text-2xl font-bold">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Step n={1} title="Pay" desc="Send USDC via x402 protocol" />
              <Step n={2} title="Provision" desc="We create a phone number + AI assistant" />
              <Step n={3} title="Configure" desc="Set voice, personality, system prompt" />
              <Step n={4} title="Call" desc="Your agent makes and receives calls" />
            </div>
          </div>

          {/* Pricing */}
          <div className="border border-border rounded-lg p-6 space-y-3 animate-fade-in-delay-3">
            <h2 className="text-2xl font-bold">Pricing</h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="text-3xl font-bold text-accent font-mono">
                  $5
                </div>
                <div className="text-muted text-sm">
                  per phone number (one-time)
                </div>
              </div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-accent font-mono">
                  $0.01
                </div>
                <div className="text-muted text-sm">per outbound call trigger</div>
              </div>
            </div>
            <p className="text-sm text-muted">
              Paid with USDC on Base via x402. No accounts, no subscriptions.
            </p>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 py-8 animate-fade-in-delay-3">
            <p className="text-muted text-lg">
              Ready to give your agent a voice?
            </p>
            <a
              href="#api"
              className="inline-block bg-accent text-background font-bold px-8 py-3 rounded-lg hover:bg-accent-dim transition-colors text-lg"
            >
              Read the API docs
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted">
        <p>
          AgentNumber — powered by{" "}
          <a
            href="https://x402.org"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            x402
          </a>{" "}
          +{" "}
          <a
            href="https://vapi.ai"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vapi
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted">{desc}</p>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-surface border border-border rounded-lg p-4 overflow-x-auto text-sm font-mono">
      <code className="text-foreground/80">{code}</code>
    </pre>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-2">
      <div className="w-10 h-10 rounded-full border-2 border-accent flex items-center justify-center font-mono font-bold text-accent">
        {n}
      </div>
      <div className="font-bold">{title}</div>
      <div className="text-sm text-muted">{desc}</div>
    </div>
  );
}
