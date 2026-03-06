"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const voices = [
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica (Female, American)" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily (Female, British)" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam (Male, American)" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will (Male, American)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah (Female, American)" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George (Male, British)" },
];

export default function CreateAgentPage() {
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [voiceId, setVoiceId] = useState(voices[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, systemPrompt, firstMessage, voiceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create agent");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted hover:text-accent transition-colors text-xs uppercase tracking-widest">
          &larr; Back
        </Link>
        <h1 className="text-xl font-bold uppercase tracking-wider">Create Agent</h1>
      </div>

      <form onSubmit={handleCreate} className="border-3 border-border p-8 space-y-5">
        <div>
          <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-widest">Agent Name</label>
          <input
            type="text"
            placeholder="MY SUPPORT AGENT"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-muted text-sm focus:outline-none focus:border-accent uppercase tracking-wider"
          />
        </div>

        <div>
          <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-widest">System Prompt</label>
          <textarea
            placeholder="You are a helpful customer support agent for..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            required
            rows={5}
            className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-muted text-sm focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div>
          <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-widest">First Message</label>
          <input
            type="text"
            placeholder="Hi there! How can I help you today?"
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-muted text-sm focus:outline-none focus:border-accent"
          />
          <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">
            What the agent says when it picks up
          </p>
        </div>

        <div>
          <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-widest">Voice</label>
          <select
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className="w-full bg-black border-3 border-border px-4 py-3 text-foreground text-sm focus:outline-none focus:border-accent"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors"
        >
          {loading ? "Creating..." : "Create Agent"}
        </button>

        {error && (
          <p className="text-accent text-sm text-center">{error}</p>
        )}
      </form>
    </div>
  );
}
