"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

const DIGITS = "0123456789";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [areaCode, setAreaCode] = useState("941");
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  // Check auth + onboarding status
  useEffect(() => {
    Promise.all([
      fetch("/api/api-keys").then(r => {
        if (r.status === 401) throw new Error("not_authenticated");
        return r.json();
      }),
      fetch("/api/credits/balance").then(r => r.json()),
    ]).then(([keysData, balanceData]) => {
      const hasKeys = (keysData.data || []).length > 0;
      const hasBalance = (balanceData.balance_cents || 0) > 0;
      if (hasKeys && hasBalance) setStep(2);
      else if (hasKeys) setStep(1);
    }).catch((err) => {
      if (err.message === "not_authenticated") {
        router.push("/login");
      }
    });
  }, [router]);

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
        localStorage.setItem("an_onboarding_key", json.key);
        setStep(1);
      } else {
        setError(json.detail || json.error || "Failed to create API key");
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
      const key = apiKey || localStorage.getItem("an_onboarding_key");
      if (!key) {
        setError("No API key found. Go back and create one.");
        setProvisioning(false);
        return;
      }

      const provRes = await fetch("/api/v0/numbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          area_code: areaCode,
          system_prompt: "You are a helpful AI assistant.",
        }),
      });
      const data = await provRes.json();
      if (!provRes.ok) {
        setError(data.error?.message || data.error || "Failed to provision number");
        setProvisioning(false);
        return;
      }
      setPhoneNumber(data.data?.phone_number || "+1 (941) 555-0173");
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
        <Link href="/" className="text-sm font-bold tracking-widest uppercase text-foreground flex items-center gap-2">
          <LogoMark size={28} />
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
        {["01 // API KEY", "02 // CREDITS", "03 // SMS NUMBER"].map((label, i) => (
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

const WALLET_ADDRESS = "0xA60F138E080e9Def57176fCD1a731343079a86F9";
const QUICK_AMOUNTS = [10, 25, 50, 100];

function StepAddCredits({ onNext }: { apiKey: string; onNext: () => void }) {
  const [copied, setCopied] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "crypto">("card");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState("");
  const [balance, setBalance] = useState(0);

  // Poll balance every 5s to detect incoming payments
  useEffect(() => {
    const check = () =>
      fetch("/api/credits/balance")
        .then((r) => r.json())
        .then((j) => setBalance(j.balance_cents ?? 0))
        .catch(() => {});
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTopUp = async (amount: number) => {
    setTopUpLoading(true);
    setTopUpError("");
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTopUpError(json.error || "Failed to create checkout");
        return;
      }
      window.location.href = json.checkout_url;
    } catch {
      setTopUpError("Something went wrong");
    } finally {
      setTopUpLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Add Credits</h1>
      <p className="text-sm text-foreground mb-8 uppercase tracking-wider">
        $1 = $1 credit &middot; Fund your account to provision numbers
      </p>

      <div className="space-y-4">
        <div className="border-3 border-border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest">Payment Method</h3>
            <div className="flex border-2 border-border">
              <button
                onClick={() => setPayMethod("card")}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                  payMethod === "card" ? "bg-accent text-background" : "hover:text-accent"
                }`}
              >
                Card
              </button>
              <button
                onClick={() => setPayMethod("crypto")}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border-l-2 border-border transition-colors ${
                  payMethod === "crypto" ? "bg-accent text-background" : "hover:text-accent"
                }`}
              >
                USDC
              </button>
            </div>
          </div>

          {payMethod === "card" ? (
            <>
              <div className="flex gap-3 flex-wrap">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleTopUp(amt)}
                    disabled={topUpLoading}
                    className="px-5 py-2 border-2 border-border text-xs font-bold uppercase tracking-widest hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xs text-foreground uppercase tracking-widest">Custom:</span>
                <div className="flex items-center border-2 border-border">
                  <span className="px-2 text-xs text-foreground">$</span>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="5-500"
                    className="w-24 bg-transparent px-2 py-2 text-sm outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    const amt = parseInt(topUpAmount);
                    if (amt >= 5 && amt <= 500) handleTopUp(amt);
                    else setTopUpError("Enter an amount between $5 and $500");
                  }}
                  disabled={topUpLoading}
                  className="px-5 py-2 bg-accent text-background text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {topUpLoading ? "Loading..." : "Top Up"}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-foreground uppercase tracking-wider">
                Send USDC on Base to the address below.
              </p>
              <div>
                <span className="text-xs text-foreground uppercase tracking-widest block mb-1">Network</span>
                <span className="text-sm font-bold">Base (Mainnet)</span>
              </div>
              <div>
                <span className="text-xs text-foreground uppercase tracking-widest block mb-1">Wallet Address</span>
                <div className="bg-black border-3 border-border px-4 py-3 flex items-center justify-between gap-2">
                  <code className="text-xs text-accent break-all">{WALLET_ADDRESS}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(WALLET_ADDRESS);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-xs text-accent uppercase tracking-widest font-bold shrink-0"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-foreground uppercase tracking-wider">
                $10 USDC per x402 request &middot; Requires API key
              </p>
            </div>
          )}

          {topUpError && (
            <p className="text-accent text-xs uppercase tracking-widest">{topUpError}</p>
          )}
        </div>

        {balance > 0 ? (
          <button
            onClick={onNext}
            className="w-full bg-accent hover:bg-accent-dim text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors"
          >
            Next: Get a Number &rarr;
          </button>
        ) : (
          <div className="w-full border-3 border-border py-3 text-center text-xs font-bold uppercase tracking-widest text-foreground/50">
            Top up to continue
          </div>
        )}

        {balance > 0 && (
          <p className="text-xs text-accent text-center uppercase tracking-wider font-bold">
            Balance: ${(balance / 100).toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}

function StepProvisionNumber({
  areaCode, setAreaCode, loading, error, onProvision,
}: {
  areaCode: string;
  setAreaCode: (v: string) => void;
  loading: boolean;
  error: string;
  onProvision: () => void;
}) {
  return (
    <div className="w-full max-w-lg">
      <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Get Your SMS Number</h1>
      <p className="text-sm text-foreground mb-8 uppercase tracking-wider">
        Provision a real US phone number for SMS
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

        <div className="border-t-3 border-border pt-4 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground uppercase tracking-wider">Number cost</span>
            <span className="font-bold text-accent">$5.00 USDC</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-foreground uppercase tracking-wider">Includes</span>
            <span className="font-bold">SMS (Send + Receive)</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-foreground uppercase tracking-wider">Voice</span>
            <span className="font-bold">Set up later in dashboard</span>
          </div>
        </div>

        <button
          onClick={onProvision}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors"
        >
          {loading ? "Provisioning..." : "Provision SMS Number — $5"}
        </button>

        {error && <p className="text-accent text-xs text-center">{error}</p>}
      </div>
    </div>
  );
}

function StepSuccess({ phoneNumber, onDashboard }: { phoneNumber: string; onDashboard: () => void }) {
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.removeItem("an_onboarding_key");
  }, []);

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
          Active &bull; SMS Ready
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <div className="text-center">
            <div className="text-xs text-foreground uppercase tracking-widest">SMS</div>
            <div className="text-sm font-bold text-accent">$0.02 / msg</div>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <div className="text-xs text-foreground uppercase tracking-widest">Voice</div>
            <div className="text-sm font-bold text-foreground">Set up in dashboard</div>
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
