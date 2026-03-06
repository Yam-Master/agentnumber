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
    return <div className="text-center text-muted py-12 text-xs uppercase tracking-widest">Loading calls...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-widest mb-2">Dashboard // Calls</p>
        <h1 className="text-xl font-bold uppercase tracking-wider">Call Log</h1>
      </div>

      {calls.length === 0 ? (
        <div className="border-3 border-border p-12 text-center">
          <p className="text-muted text-xs uppercase tracking-widest">No calls yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div key={call.id} className="border-3 border-border">
              <button
                onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 border-2 uppercase tracking-wider ${
                    call.direction === "inbound"
                      ? "border-foreground text-foreground"
                      : "border-accent text-accent"
                  }`}>
                    {call.direction === "inbound" ? "IN" : "OUT"}
                  </span>
                  <div>
                    <span className="font-bold text-sm">{call.agents?.name || "Unknown"}</span>
                    {call.customer_number && (
                      <span className="text-muted text-sm ml-3">{call.customer_number}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>{formatDuration(call.duration)}</span>
                  <span>{new Date(call.created_at).toLocaleDateString()}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border-2 uppercase ${
                    call.status === "completed"
                      ? "border-foreground text-foreground"
                      : "border-muted text-muted"
                  }`}>
                    {call.status || "unknown"}
                  </span>
                </div>
              </button>

              {expandedId === call.id && (
                <div className="px-4 pb-4 border-t-3 border-border pt-4 space-y-3">
                  {call.summary && (
                    <div>
                      <h4 className="text-[10px] font-bold text-muted mb-1 uppercase tracking-widest">Summary</h4>
                      <p className="text-sm">{call.summary}</p>
                    </div>
                  )}
                  {call.transcript && (
                    <div>
                      <h4 className="text-[10px] font-bold text-muted mb-1 uppercase tracking-widest">Transcript</h4>
                      <pre className="text-xs whitespace-pre-wrap bg-black border-3 border-border p-3 max-h-64 overflow-y-auto">
                        {call.transcript}
                      </pre>
                    </div>
                  )}
                  {call.recording_url && (
                    <div>
                      <h4 className="text-[10px] font-bold text-muted mb-1 uppercase tracking-widest">Recording</h4>
                      <audio controls className="w-full">
                        <source src={call.recording_url} />
                      </audio>
                    </div>
                  )}
                  {call.ended_reason && (
                    <p className="text-[10px] text-muted uppercase tracking-wider">Ended: {call.ended_reason}</p>
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
