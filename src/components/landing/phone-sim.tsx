"use client";

import { useEffect, useRef, useState } from "react";

// Gray = AI agent (left), Blue = user (right)
const MESSAGES = [
  { dir: "in", body: "Hi! I'm your AI assistant. How can I help you today?" },
  { dir: "out", body: "When will my order arrive?" },
  { dir: "in", body: "Order #4821 is arriving March 7, 2026. I sent tracking to your email." },
  { dir: "out", body: "Can I change the address?" },
  { dir: "in", body: "Done — address updated. Confirmation sent." },
  { dir: "out", body: "Thanks!" },
  { dir: "in", body: "You're welcome! Anything else?" },
  { dir: "out", body: "What's my balance?" },
  { dir: "in", body: "Your balance is 847.50 USDC on Base." },
  { dir: "out", body: "Is my subscription active?" },
  { dir: "in", body: "Yes — Pro plan active through April 2026." },
  { dir: "out", body: "Perfect, thank you" },
];

const CALLERS = [
  { name: "(941) 555-0173", location: "Sarasota, FL" },
  { name: "(212) 555-0044", location: "New York, NY" },
  { name: "(310) 555-0188", location: "Los Angeles, CA" },
  { name: "(415) 555-0092", location: "San Francisco, CA" },
];

function formatTime() {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function PhoneSim() {
  const [mode, setMode] = useState<"sms" | "call">("sms");
  const [clock, setClock] = useState(formatTime());
  const [messages, setMessages] = useState<{ dir: string; body: string }[]>([]);
  const msgIdx = useRef(0);
  const [caller, setCaller] = useState(CALLERS[0]);
  const [callState, setCallState] = useState<"calling" | "connected">("calling");
  const [callTimer, setCallTimer] = useState(0);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setClock(formatTime()), 30000);
    return () => clearInterval(id);
  }, []);

  // SMS feed
  useEffect(() => {
    if (mode !== "sms") return;
    function addMsg() {
      const m = MESSAGES[msgIdx.current % MESSAGES.length];
      msgIdx.current++;
      setMessages((prev) => [...prev.slice(-5), { dir: m.dir, body: m.body }]);
    }
    const t1 = setTimeout(addMsg, 400);
    const t2 = setTimeout(addMsg, 1200);
    const t3 = setTimeout(addMsg, 2100);
    const id = setInterval(addMsg, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(id); };
  }, [mode]);

  // Call cycle
  useEffect(() => {
    function triggerCall() {
      const c = CALLERS[Math.floor(Math.random() * CALLERS.length)];
      setCaller(c);
      setCallTimer(0);
      setCallState("calling");
      setMode("call");
      const answerT = setTimeout(() => setCallState("connected"), 3500);
      const hangupT = setTimeout(() => setMode("sms"), 10000);
      return () => { clearTimeout(answerT); clearTimeout(hangupT); };
    }
    const first = setTimeout(triggerCall, 11000);
    const recurring = setInterval(triggerCall, 24000);
    return () => { clearTimeout(first); clearInterval(recurring); };
  }, []);

  // Call timer
  useEffect(() => {
    if (mode !== "call" || callState !== "connected") return;
    setCallTimer(0);
    const id = setInterval(() => setCallTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [mode, callState]);

  const dur = `${Math.floor(callTimer / 60)}:${(callTimer % 60).toString().padStart(2, "0")}`;

  return (
    <div className="ip">
      {/* Dynamic Island */}
      <div className="ip-notch"><div className="ip-cam" /></div>

      {/* Status bar */}
      <div className="ip-status">
        <span className="ip-clock">{clock}</span>
        <div className="ip-indicators">
          <svg width="17" height="12" viewBox="0 0 17 12" fill="white"><rect x="0" y="8" width="3" height="4" rx="0.5" opacity="0.35"/><rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" opacity="0.35"/><rect x="9" y="3" width="3" height="9" rx="0.5"/><rect x="13.5" y="0" width="3" height="12" rx="0.5"/></svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="white"><path d="M7.5 9.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM7.5 6c1.55 0 2.95.63 3.97 1.65l-1.42 1.42A3.47 3.47 0 007.5 8c-.96 0-1.84.39-2.55 1.07L3.53 7.65A5.47 5.47 0 017.5 6zm0-4c2.65 0 5.05 1.08 6.78 2.83l-1.42 1.42A7.46 7.46 0 007.5 4 7.46 7.46 0 002.14 6.25L.72 4.83A9.46 9.46 0 017.5 2z"/></svg>
          <div className="ip-batt"><div className="ip-batt-shell"><div className="ip-batt-juice" /></div><div className="ip-batt-tip" /></div>
        </div>
      </div>

      {/* === SMS / iMessage === */}
      {mode === "sms" && (
        <div className="im">
          {/* Nav: centered avatar + number pill */}
          <div className="im-nav">
            <div className="im-back-btn">
              <svg width="12" height="20" viewBox="0 0 12 20" fill="#007AFF"><path d="M11.67 1.77L9.9 0 0 9.9 9.9 19.8l1.77-1.77L3.54 9.9z"/></svg>
            </div>
            <div className="im-center">
              <div className="im-ava-oc">OC</div>
              <div className="im-pill">
                OpenClaw Agent
                <svg width="8" height="12" viewBox="0 0 8 12" fill="rgba(255,255,255,0.4)"><path d="M1.5 0L0 1.5 4.5 6 0 10.5 1.5 12l6-6z"/></svg>
              </div>
            </div>
          </div>

          {/* Date label */}
          <div className="im-date">Text Message &middot; SMS</div>

          {/* Messages */}
          <div className="im-msgs">
            {messages.map((m, i) => (
              <div key={i} className={`im-bub ${m.dir === "out" ? "im-me" : "im-them"}`}>
                {m.body}
              </div>
            ))}
          </div>

          {/* Input bar */}
          <div className="im-bar">
            <div className="im-plus-btn">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><circle cx="15" cy="15" r="13"/><path d="M10 15h10M15 10v10"/></svg>
            </div>
            <div className="im-input-wrap">
              <span className="im-placeholder">Text Message &middot; SMS</span>
              <svg className="im-mic" width="16" height="22" viewBox="0 0 16 22" fill="rgba(255,255,255,0.3)"><path d="M8 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S5 3.34 5 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H1c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </div>
          </div>
        </div>
      )}

      {/* === Call Screen === */}
      {mode === "call" && (
        <div className="cs">
          {/* Top info */}
          <div className="cs-top">
            <div className="cs-label">{callState === "calling" ? "Calling..." : dur}</div>
            <div className="cs-number">{caller.name}</div>
            <div className="cs-location">{caller.location}</div>
          </div>

          {/* Spacer */}
          <div className="cs-spacer" />

          {/* 2×3 button grid at bottom */}
          <div className="cs-grid">
            {/* Row 1: Audio, FaceTime, Mute */}
            <CBtn icon="audio" label="Audio" mint />
            <CBtn icon="facetime" label="FaceTime" />
            <CBtn icon="mute" label="Mute" />
            {/* Row 2: More, End, Keypad */}
            <CBtn icon="more" label="More" />
            <CBtn icon="end" label="End" red />
            <CBtn icon="keypad" label="Keypad" />
          </div>
        </div>
      )}

      {/* Home bar */}
      <div className="ip-home"><div className="ip-home-pill" /></div>
    </div>
  );
}

function CBtn({ icon, label, red, mint }: { icon: string; label: string; red?: boolean; mint?: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    audio: (
      /* AirPods Pro icon — matched from iOS screenshot */
      <svg width="30" height="30" viewBox="0 0 32 32" fill={mint ? "#1C1C1E" : "white"}>
        {/* Left AirPod */}
        <path d="M10 8c-2.2 0-4 1.8-4 4v1.5c0 1.4.7 2.6 1.8 3.3L8 22.5c0 .8.7 1.5 1.5 1.5h1c.8 0 1.5-.7 1.5-1.5l.2-5.7c1.1-.7 1.8-1.9 1.8-3.3V12c0-2.2-1.8-4-4-4z"/>
        <circle cx="8.5" cy="12.5" r="1.8" fill={mint ? "#C8FAE8" : "#333"}/>
        <circle cx="8.5" cy="12.5" r="0.8" fill={mint ? "#888" : "#666"}/>
        {/* Right AirPod */}
        <path d="M22 8c2.2 0 4 1.8 4 4v1.5c0 1.4-.7 2.6-1.8 3.3L24 22.5c0 .8-.7 1.5-1.5 1.5h-1c-.8 0-1.5-.7-1.5-1.5l-.2-5.7c-1.1-.7-1.8-1.9-1.8-3.3V12c0-2.2 1.8-4 4-4z"/>
        <circle cx="23.5" cy="12.5" r="1.8" fill={mint ? "#C8FAE8" : "#333"}/>
        <circle cx="23.5" cy="12.5" r="0.8" fill={mint ? "#888" : "#666"}/>
      </svg>
    ),
    facetime: <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>,
    mute: <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/><path d="M3 3l18 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>,
    more: <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>,
    end: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
      </svg>
    ),
    keypad: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <circle cx="6" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="18" cy="5" r="2"/>
        <circle cx="6" cy="11" r="2"/><circle cx="12" cy="11" r="2"/><circle cx="18" cy="11" r="2"/>
        <circle cx="6" cy="17" r="2"/><circle cx="12" cy="17" r="2"/><circle cx="18" cy="17" r="2"/>
      </svg>
    ),
  };

  return (
    <div className="cs-btn-wrap">
      <div className={`cs-btn-circle ${red ? "cs-red" : ""} ${mint ? "cs-mint" : ""}`}>
        {icons[icon]}
      </div>
      <span className="cs-btn-label">{label}</span>
    </div>
  );
}
