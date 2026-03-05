"use client";

import { useState } from "react";
import Link from "next/link";

const personalities = [
  { id: "friendly", label: "Friendly Assistant", emoji: "😊" },
  { id: "comedian", label: "Sarcastic Comedian", emoji: "😏" },
  { id: "sales", label: "Sales Rep", emoji: "💼" },
  { id: "techsupport", label: "Tech Support", emoji: "🔧" },
];

export default function Home() {
  const [phone, setPhone] = useState("");
  const [personality, setPersonality] = useState("friendly");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCall() {
    if (!phone.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, personality }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold tracking-tight">AgentNumber</span>
        <div className="flex gap-4 items-center">
          <Link
            href="/login"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
          Give your AI agent
          <br />
          <span className="text-accent-light">a phone number</span>
        </h1>
        <p className="mt-6 text-lg text-muted max-w-xl mx-auto">
          One API call. Your agent can make and receive phone calls. Build voice
          AI experiences in minutes, not months.
        </p>
        <a
          href="#demo"
          className="inline-block mt-8 bg-accent hover:bg-accent-light text-white text-lg font-medium px-8 py-3 rounded-xl transition-colors"
        >
          Try it now
        </a>
      </section>

      {/* Demo Section */}
      <section id="demo" className="max-w-xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border bg-zinc-900/50 p-8">
          <h2 className="text-2xl font-bold text-center mb-2">
            Get a call from an AI agent
          </h2>
          <p className="text-muted text-center mb-8 text-sm">
            Enter your phone number and we&apos;ll call you in ~10 seconds.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">
                Phone number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-zinc-800 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">
                Personality
              </label>
              <div className="grid grid-cols-2 gap-2">
                {personalities.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersonality(p.id)}
                    className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                      personality === p.id
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-zinc-800/50 text-muted hover:border-zinc-600"
                    }`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCall}
              disabled={status === "loading" || !phone.trim()}
              className="w-full bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors mt-2"
            >
              {status === "loading" ? "Calling..." : "Call me now"}
            </button>

            {status === "success" && (
              <div className="text-center text-green-400 text-sm mt-2">
                Call initiated! Your phone should ring any moment.
              </div>
            )}
            {status === "error" && (
              <div className="text-center text-red-400 text-sm mt-2">
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Create an agent",
              desc: "Define your agent's personality, voice, and system prompt.",
            },
            {
              step: "2",
              title: "Get a phone number",
              desc: "We provision a real phone number for your agent instantly.",
            },
            {
              step: "3",
              title: "Start calling",
              desc: "Your agent can make outbound calls or receive inbound ones.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-accent/20 text-accent-light font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-muted text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to build?</h2>
        <p className="text-muted mb-8">
          Create your own AI phone agent in under 5 minutes.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-accent hover:bg-accent-light text-white text-lg font-medium px-8 py-3 rounded-xl transition-colors"
        >
          Create your agent
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        AgentNumber &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
