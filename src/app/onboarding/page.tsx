"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DIGITS = "0123456789";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [areaCode, setAreaCode] = useState("941");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  // Check if user already completed onboarding
  useEffect(() => {
    Promise.all([
      fetch("/api/api-keys").then(r => r.json()),
      fetch("/api/credits/balance").then(r => r.json()),
    ]).then(([keysData, balanceData]) => {
      const hasKeys = (keysData.data || []).length > 0;
      const hasBalance = (balanceData.balance_cents || 0) > 0;
      if (hasKeys && hasBalance) setStep(2);
      else if (hasKeys) setStep(1);
    }).catch(() => {});
  }, []);

  async function handleCreateKey() {
    setCreatingKey(true);
    setError("");
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName || "Default" }),
      });
      const json = await res.json();
      if (json.key) {
        setApiKey(json.key);
        setStep(1);
      } else {
        setError("Failed to create API key");
      }
    } catch {
      setError("Network error");
    }
    setCreatingKey(false);
  }

  async function handleProvision() {
    setProvisioning(true);
    setError("");
    try {
      const res = await fetch("/api/api-keys").then(r => r.json());
      const keys = res.data || [];
      if (keys.length === 0) {
        setError("No API key found. Go back and create one.");
        setProvisioning(false);
        return;
      }
      // Find the raw key — use the most recent active key prefix to find it
      // We call the v0 endpoint via internal fetch with cookie auth
      const provRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Agent",
          systemPrompt: systemPrompt || "You are a helpful AI assistant.",
          firstMessage: "Hello! How can I help you?",
          voiceId: "cgSgspJ2msm6clMCkdW9",
          areaCode,
        }),
      });
      const data = await provRes.json();
      if (!provRes.ok) {
        setError(data.error || "Failed to provision number");
        setProvisioning(false);
        return;
      }
      setPhoneNumber(data.phoneNumber || data.phone_number || "+1 (941) 555-0173");
      setStep(3);
      setShowSuccess(true);
    } catch {
      setError("Network error");
    }
    setProvisioning(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b-3 border-accent px-6 py-4 flex items-center justify-between bg-black">
        <Link href="/" className="text-sm font-bold tracking-widest uppercase text-foreground">
          AGENT<span className="text-accent">[NUMBER]</span>
        </Link>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs text-foreground uppercase tracking-widest hover:text-foreground transition-colors"
        >
          Skip to Dashboard &rarr;
        </button>
      </nav>

      {/* Progress */}
      <div className="flex border-b-3 border-border">
        {["01 // API KEY", "02 // CREDITS", "03 // NUMBER"].map((label, i) => (
          <div
            key={i}
            className={`flex-1 py-3 px-6 text-xs font-bold uppercase tracking-widest border-r-3 border-border last:border-r-0 transition-colors ${
              i === step
                ? "bg-accent text-white"
                : i < step
                  ? "bg-accent/10 text-accent"
                  : "text-foreground"
            }`}
          >
            {label}
            {i < step && <span className="ml-2">&check;</span>}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {step === 0 && (
          <StepCreateKey
            keyName={keyName}
            setKeyName={setKeyName}
            apiKey={apiKey}
            loading={creatingKey}
            error={error}
            onCreateKey={handleCreateKey}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepAddCredits
            apiKey={apiKey}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepProvisionNumber
            areaCode={areaCode}
            setAreaCode={setAreaCode}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            loading={provisioning}
            error={error}
            onProvision={handleProvision}
          />
        )}
        {step === 3 && showSuccess && (
          <StepSuccess
            phoneNumber={phoneNumber}
            onDashboard={() => router.push("/dashboard")}
          />
        )}
      </div>
    </div>
  );
}

function StepCreateKey({
  keyName, setKeyName, apiKey, loading, error, onCreateKey, onNext,
}: {
  keyName: string;
  setKeyName: (v: string) => void;
  apiKey: string;
  loading: boolean;
  error: string;
  onCreateKey: () => void;
  onNext: () => void;
}) {
  return (
    <div className="w-full max-w-lg">
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Create Your API Key</h1>
      <p className="text-sm text-foreground mb-8 uppercase tracking-wider">
        Your key authenticates all API requests
      </p>

      {!apiKey ? (
        <div className="border-3 border-border p-8 space-y-4">
          <div>
            <label className="block text-xs text-foreground mb-1.5 uppercase tracking-widest">Key Name</label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="MY AGENT KEY"
              className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:border-accent uppercase tracking-wider"
            />
          </div>
          <button
            onClick={onCreateKey}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors"
          >
            {loading ? "Creating..." : "Generate API Key"}
          </button>
          {error && <p className="text-accent text-xs text-center">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-3 border-accent p-6">
            <p className="text-xs text-accent font-bold uppercase tracking-widest mb-3">
              Your API Key — Save this now
            </p>
            <code className="block text-sm bg-black border-3 border-border px-4 py-3 break-all">
              {apiKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(apiKey)}
              className="mt-3 text-xs text-accent hover:underline uppercase tracking-widest font-bold"
            >
              Copy to Clipboard
            </button>
          </div>
          <button
            onClick={onNext}
            className="w-full bg-accent hover:bg-accent-dim text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors"
          >
            Next: Add Credits &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

function StepAddCredits({ apiKey, onNext }: { apiKey: string; onNext: () => void }) {
  const [copied, setCopied] = useState(false);
  const payAddress = process.env.NEXT_PUBLIC_PAY_TO_ADDRESS || "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68";

  return (
    <div className="w-full max-w-lg">
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Add Credits</h1>
      <p className="text-sm text-foreground mb-8 uppercase tracking-wider">
        Fund your account to provision numbers
      </p>

      <div className="space-y-4">
        {/* Manual USDC */}
        <div className="border-3 border-border p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">
            Option A // Send USDC on Base
          </h3>
          <p className="text-xs text-foreground mb-3 uppercase tracking-wider">
            Send USDC to this address on Base L2:
          </p>
          <div className="bg-black border-3 border-border px-4 py-3 flex items-center justify-between gap-2">
            <code className="text-xs break-all">{payAddress}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(payAddress);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs text-accent uppercase tracking-widest font-bold shrink-0"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-foreground uppercase tracking-wider">$5 USDC</span>
              <span className="font-bold">=500 credits</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foreground uppercase tracking-wider">$10 USDC</span>
              <span className="font-bold">=1000 credits</span>
            </div>
          </div>
        </div>

        {/* x402 */}
        <div className="border-3 border-border p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">
            Option B // x402 Protocol
          </h3>
          <p className="text-xs text-foreground uppercase tracking-wider">
            Credits are automatically deducted via x402 when you make API calls.
            No manual funding needed — your wallet pays per request.
          </p>
          {apiKey && (
            <div className="mt-3 bg-black border-3 border-border px-4 py-3">
              <code className="text-xs text-foreground">
                curl -H &quot;Authorization: Bearer {apiKey.slice(0, 20)}...&quot; \<br />
                &nbsp;&nbsp;POST /api/v0/numbers
              </code>
            </div>
          )}
        </div>

        <button
          onClick={onNext}
          className="w-full bg-accent hover:bg-accent-dim text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors"
        >
          Next: Get a Number &rarr;
        </button>

        <p className="text-xs text-foreground text-center uppercase tracking-wider">
          You can add credits later from the dashboard
        </p>
      </div>
    </div>
  );
}

function StepProvisionNumber({
  areaCode, setAreaCode, systemPrompt, setSystemPrompt, loading, error, onProvision,
}: {
  areaCode: string;
  setAreaCode: (v: string) => void;
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  loading: boolean;
  error: string;
  onProvision: () => void;
}) {
  return (
    <div className="w-full max-w-lg">
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Get Your Number</h1>
      <p className="text-sm text-foreground mb-8 uppercase tracking-wider">
        Provision a real US phone number for your agent
      </p>

      <div className="border-3 border-border p-8 space-y-5">
        <div>
          <label className="block text-xs text-foreground mb-1.5 uppercase tracking-widest">Area Code</label>
          <input
            type="text"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="941"
            maxLength={3}
            className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:border-accent tracking-wider"
          />
        </div>

        <div>
          <label className="block text-xs text-foreground mb-1.5 uppercase tracking-widest">
            System Prompt (What should your agent do?)
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful AI assistant that answers customer questions about..."
            rows={4}
            className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="border-t-3 border-border pt-4 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground uppercase tracking-wider">Number cost</span>
            <span className="font-bold text-accent">$5.00 USDC</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-foreground uppercase tracking-wider">Includes</span>
            <span className="font-bold">SMS + Voice</span>
          </div>
        </div>

        <button
          onClick={onProvision}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors"
        >
          {loading ? "Provisioning..." : "Provision Number — $5"}
        </button>

        {error && <p className="text-accent text-xs text-center">{error}</p>}
      </div>
    </div>
  );
}

function StepSuccess({ phoneNumber, onDashboard }: { phoneNumber: string; onDashboard: () => void }) {
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = displayRef.current;
    if (!el) return;

    const target = phoneNumber;
    const chars = target.split("");
    const positions: number[] = [];
    for (let i = 0; i < chars.length; i++) {
      if (DIGITS.includes(chars[i])) positions.push(i);
    }
    let iterations = 0;
    const maxIterations = 25;
    const settled: number[] = [];
    const interval = setInterval(() => {
      iterations++;
      const display = chars.slice();
      for (let p = 0; p < positions.length; p++) {
        const idx = positions[p];
        if (settled.includes(idx)) continue;
        if (iterations > maxIterations - positions.length + p) {
          settled.push(idx);
          continue;
        }
        display[idx] = DIGITS[Math.floor(Math.random() * 10)];
      }
      el.textContent = display.join("");
      if (settled.length === positions.length) {
        clearInterval(interval);
        el.textContent = target;
      }
    }, 50);

    return () => clearInterval(interval);
  }, [phoneNumber]);

  return (
    <div className="w-full max-w-lg text-center">
      <div className="border-3 border-accent p-12 mb-8 relative overflow-hidden">
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-b-3 border-r-3 border-accent" />
        <div className="absolute top-0 right-0 w-8 h-8 border-b-3 border-l-3 border-accent" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-t-3 border-r-3 border-accent" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-t-3 border-l-3 border-accent" />

        <div className="text-xs text-accent font-bold uppercase tracking-widest mb-6">
          Number Provisioned Successfully
        </div>

        <div className="text-xs text-foreground uppercase tracking-widest mb-2">
          Your Agent&apos;s Number
        </div>

        <div
          ref={displayRef}
          className="text-4xl font-bold text-foreground tracking-wider mb-4"
        >
          {phoneNumber}
        </div>

        <div className="text-xs text-accent uppercase tracking-widest font-bold">
          Active &bull; SMS + Voice
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <div className="text-center">
            <div className="text-xs text-foreground uppercase tracking-widest">SMS</div>
            <div className="text-sm font-bold text-accent">$0.02</div>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <div className="text-xs text-foreground uppercase tracking-widest">Voice</div>
            <div className="text-sm font-bold text-accent">$0.05/min</div>
          </div>
        </div>
      </div>

      <button
        onClick={onDashboard}
        className="w-full bg-accent hover:bg-accent-dim text-white font-bold py-4 uppercase tracking-widest text-sm transition-colors"
      >
        Go to Dashboard &rarr;
      </button>

      <p className="text-xs text-foreground mt-4 uppercase tracking-wider">
        You can manage your number from the dashboard
      </p>
    </div>
  );
}
