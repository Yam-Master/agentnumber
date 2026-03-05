"use client";

import { useState } from "react";

export function CallModal({
  agentId,
  agentName,
}: {
  agentId: string;
  agentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCall() {
    if (!phone.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Failed to initiate call");
        return;
      }
      setStatus("success");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
        setPhone("");
      }, 2000);
    } catch {
      setStatus("error");
      setErrorMsg("Network error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-accent-light hover:text-foreground px-3 py-1.5 border border-accent/30 rounded-lg transition-colors"
      >
        Call someone
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-border rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-lg mb-1">
              Call with {agentName}
            </h3>
            <p className="text-muted text-sm mb-4">
              Enter a phone number for your agent to call.
            </p>

            <input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-800 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setStatus("idle");
                  setPhone("");
                }}
                className="flex-1 border border-border text-muted hover:text-foreground py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCall}
                disabled={status === "loading" || !phone.trim()}
                className="flex-1 bg-accent hover:bg-accent-light disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {status === "loading" ? "Calling..." : "Call"}
              </button>
            </div>

            {status === "success" && (
              <p className="text-green-400 text-sm text-center mt-3">
                Call initiated!
              </p>
            )}
            {status === "error" && (
              <p className="text-red-400 text-sm text-center mt-3">
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
