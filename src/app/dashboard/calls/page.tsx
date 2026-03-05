"use client";

import { useEffect, useState } from "react";

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
  agents: { name: string } | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calls")
      .then((res) => res.json())
      .then((data) => {
        setCalls(data.calls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center text-muted py-12">Loading calls...</div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Call Log</h1>

      {calls.length === 0 ? (
        <div className="rounded-2xl border border-border bg-zinc-900/50 p-12 text-center">
          <p className="text-muted">No calls yet. Make your first call from the Agents page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => (
            <div
              key={call.id}
              className="rounded-xl border border-border bg-zinc-900/50"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === call.id ? null : call.id)
                }
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      call.direction === "inbound"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {call.direction === "inbound" ? "IN" : "OUT"}
                  </span>
                  <div>
                    <span className="font-medium">
                      {call.agents?.name || "Unknown Agent"}
                    </span>
                    {call.customer_number && (
                      <span className="text-muted text-sm ml-3 font-mono">
                        {call.customer_number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span>{formatDuration(call.duration)}</span>
                  <span>
                    {new Date(call.created_at).toLocaleDateString()}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      call.status === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : call.status === "initiated"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-zinc-500/20 text-zinc-400"
                    }`}
                  >
                    {call.status || "unknown"}
                  </span>
                </div>
              </button>

              {expandedId === call.id && (
                <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
                  {call.summary && (
                    <div>
                      <h4 className="text-xs font-medium text-muted mb-1">
                        Summary
                      </h4>
                      <p className="text-sm">{call.summary}</p>
                    </div>
                  )}
                  {call.transcript && (
                    <div>
                      <h4 className="text-xs font-medium text-muted mb-1">
                        Transcript
                      </h4>
                      <pre className="text-sm whitespace-pre-wrap bg-zinc-800 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs">
                        {call.transcript}
                      </pre>
                    </div>
                  )}
                  {call.recording_url && (
                    <div>
                      <h4 className="text-xs font-medium text-muted mb-1">
                        Recording
                      </h4>
                      <audio controls className="w-full">
                        <source src={call.recording_url} />
                      </audio>
                    </div>
                  )}
                  {call.ended_reason && (
                    <p className="text-xs text-muted">
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
