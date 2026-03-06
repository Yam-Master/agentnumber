"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Call {
  id: string;
  agent_id: string;
  vapi_call_id: string;
  direction: string;
  customer_number: string | null;
  status: string | null;
  duration: number | null;
  transcript: string | null;
  summary: string | null;
  recording_url: string | null;
  ended_reason: string | null;
  created_at: string;
  cost_cents: number | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasVoice, setHasVoice] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/calls").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ])
      .then(([callsData, agentsData]) => {
        setCalls(callsData.calls || []);
        const agents = agentsData.agents || [];
        setHasVoice(agents.length > 0 || (callsData.calls || []).length > 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center text-foreground py-12 text-xs uppercase tracking-widest">
        Loading...
      </div>
    );
  }

  // Voice not set up — show setup prompt
  if (!hasVoice) {
    return (
      <div>
        <div className="mb-6">
          <p className="text-xs text-foreground uppercase tracking-widest mb-2">
            Dashboard // Voice Calls
          </p>
          <h1 className="text-xl font-bold uppercase tracking-wider">Voice Calls</h1>
        </div>

        <div className="border-3 border-border p-12">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="text-4xl">&#9742;</div>
            <h2 className="text-lg font-bold uppercase tracking-wider">
              Set Up Voice Calling
            </h2>
            <p className="text-sm text-foreground uppercase tracking-wider">
              Your number supports SMS. Enable AI voice calls to let your agent answer and make phone calls.
            </p>

            <div className="border-3 border-border p-6 text-left space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent">
                What You Get
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-accent font-bold">-</span>
                  <span className="text-sm">
                    <strong>Inbound calls</strong> — AI agent answers calls to your number
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-accent font-bold">-</span>
                  <span className="text-sm">
                    <strong>Outbound calls</strong> — Your agent calls any phone number via API
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-accent font-bold">-</span>
                  <span className="text-sm">
                    <strong>Transcripts + recordings</strong> — Every call logged automatically
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-accent font-bold">-</span>
                  <span className="text-sm">
                    <strong>$0.05 / minute</strong> — Billed per minute from your credits
                  </span>
                </div>
              </div>
            </div>

            <div className="border-3 border-border p-6 text-left space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent">
                Setup Steps
              </h3>
              <div className="space-y-3">
                <SetupStep num="1" label="Configure your agent's voice and personality" />
                <SetupStep num="2" label="Set a system prompt for how your agent handles calls" />
                <SetupStep num="3" label="Choose a voice (11 Labs) and first message" />
              </div>
            </div>

            <Link
              href="/dashboard/create"
              className="block w-full bg-accent hover:bg-accent-dim text-white font-bold py-3 uppercase tracking-widest text-sm transition-colors text-center"
            >
              Set Up Voice &rarr;
            </Link>

            <p className="text-xs text-foreground uppercase tracking-wider">
              Uses your existing number &bull; No extra provisioning cost
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Voice is set up — show call log
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-foreground uppercase tracking-widest mb-2">
          Dashboard // Voice Calls
        </p>
        <h1 className="text-xl font-bold uppercase tracking-wider">Call Log</h1>
      </div>

      {calls.length === 0 ? (
        <div className="border-3 border-border p-12 text-center">
          <p className="text-foreground text-xs uppercase tracking-widest mb-4">
            No calls yet
          </p>
          <p className="text-xs text-foreground uppercase tracking-wider">
            Make your first call via the API: POST /api/v0/calls
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div key={call.id} className="border-3 border-border">
              <button
                onClick={() =>
                  setExpandedId(expandedId === call.id ? null : call.id)
                }
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 border-2 uppercase tracking-wider ${
                      call.direction === "inbound"
                        ? "border-foreground text-foreground"
                        : "border-accent text-accent"
                    }`}
                  >
                    {call.direction === "inbound" ? "IN" : "OUT"}
                  </span>
                  <span className="font-bold text-sm">
                    {call.customer_number || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground">
                  <span>{formatDuration(call.duration)}</span>
                  {call.cost_cents != null && (
                    <span>${(call.cost_cents / 100).toFixed(2)}</span>
                  )}
                  <span>
                    {new Date(call.created_at).toLocaleDateString()}
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 border-2 uppercase ${
                      call.status === "completed"
                        ? "border-foreground text-foreground"
                        : "border-foreground/30 text-foreground"
                    }`}
                  >
                    {call.status || "unknown"}
                  </span>
                </div>
              </button>

              {expandedId === call.id && (
                <div className="px-4 pb-4 border-t-3 border-border pt-4 space-y-3">
                  {call.summary && (
                    <div>
                      <h4 className="text-xs font-bold text-foreground mb-1 uppercase tracking-widest">
                        Summary
                      </h4>
                      <p className="text-sm">{call.summary}</p>
                    </div>
                  )}
                  {call.transcript && (
                    <div>
                      <h4 className="text-xs font-bold text-foreground mb-1 uppercase tracking-widest">
                        Transcript
                      </h4>
                      <pre className="text-xs whitespace-pre-wrap bg-black border-3 border-border p-3 max-h-64 overflow-y-auto">
                        {call.transcript}
                      </pre>
                    </div>
                  )}
                  {call.recording_url && (
                    <div>
                      <h4 className="text-xs font-bold text-foreground mb-1 uppercase tracking-widest">
                        Recording
                      </h4>
                      <audio controls className="w-full">
                        <source src={call.recording_url} />
                      </audio>
                    </div>
                  )}
                  {call.ended_reason && (
                    <p className="text-xs text-foreground uppercase tracking-wider">
                      Ended: {call.ended_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SetupStep({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 border-2 border-accent text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
        {num}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}
