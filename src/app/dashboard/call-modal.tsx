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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
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
        className="text-xs text-accent hover:underline px-3 py-1.5 border-2 border-accent uppercase tracking-widest font-bold transition-colors"
      >
        Call
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-background border-3 border-border p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-sm uppercase tracking-widest mb-1">
              Call with {agentName}
            </h3>
            <p className="text-foreground text-xs mb-4 uppercase tracking-wider">
              Enter phone number for agent to call
            </p>

            <input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-transparent border-3 border-border px-4 py-3 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:border-accent mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setStatus("idle");
                  setPhone("");
                }}
                className="flex-1 border-3 border-border text-foreground hover:text-foreground py-2.5 uppercase tracking-widest text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCall}
                disabled={status === "loading" || !phone.trim()}
                className="flex-1 bg-accent hover:bg-accent-dim disabled:opacity-50 text-white font-bold py-2.5 uppercase tracking-widest text-xs transition-colors"
              >
                {status === "loading" ? "Calling..." : "Call"}
              </button>
            </div>

            {status === "success" && (
              <p className="text-foreground text-xs text-center mt-3 uppercase tracking-widest font-bold">Call initiated</p>
            )}
            {status === "error" && (
              <p className="text-accent text-xs text-center mt-3">{errorMsg}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
