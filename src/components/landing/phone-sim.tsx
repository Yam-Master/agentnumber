"use client";

import { useEffect, useRef } from "react";

const MESSAGES = [
  { dir: "outbound", body: "Your order #4821 has shipped." },
  { dir: "inbound", body: "When will it arrive?" },
  { dir: "outbound", body: "Estimated delivery: March 7, 2026." },
  { dir: "inbound", body: "Can I change the address?" },
  { dir: "outbound", body: "Address updated. Confirmation sent." },
  { dir: "inbound", body: "Thanks!" },
  { dir: "outbound", body: "Appointment confirmed for 3:00 PM." },
  { dir: "inbound", body: "Can I reschedule to Friday?" },
  { dir: "outbound", body: "Rescheduled to Friday 3:00 PM." },
  { dir: "outbound", body: "Payment of $24.99 received." },
  { dir: "inbound", body: "Is my subscription active?" },
  { dir: "outbound", body: "Pro plan active through April 2026." },
  { dir: "inbound", body: "What is my balance?" },
  { dir: "outbound", body: "Balance: 847.50 USDC on Base." },
  { dir: "outbound", body: "Alert: Unusual login. Reply BLOCK." },
  { dir: "inbound", body: "BLOCK" },
  { dir: "outbound", body: "Account secured. Sessions revoked." },
];

const CALLERS = [
  "+1 (212) 555-0044",
  "+1 (310) 555-0188",
  "+1 (415) 555-0092",
  "+1 (512) 555-0231",
  "+44 20 7946 0958",
];

const DIGITS = "0123456789";
const MAX_VISIBLE = 4;

function StatusIcons() {
  return (
    <div className="status-icons">
      <svg viewBox="0 0 16 16">
        <path d="M1 11h2v4H1zM5 8h2v7H5zM9 5h2v10H9zM13 1h2v14h-2z" />
      </svg>
      <svg viewBox="0 0 16 16">
        <path d="M8 3C5.5 3 3.3 4 1.7 5.7l1.4 1.4C4.5 5.7 6.2 5 8 5s3.5.7 4.9 2.1l1.4-1.4C12.7 4 10.5 3 8 3zm0 4c-1.5 0-2.9.6-3.9 1.6L5.5 10c.7-.7 1.6-1 2.5-1s1.8.3 2.5 1l1.4-1.4C10.9 7.6 9.5 7 8 7zm0 4c-.6 0-1.1.2-1.5.6L8 13.2l1.5-1.6c-.4-.4-.9-.6-1.5-.6z" />
      </svg>
      <div className="battery">
        <div className="battery-fill" />
      </div>
    </div>
  );
}

function formatTime(d: Date) {
  return `${d.getHours() < 10 ? "0" : ""}${d.getHours()}:${d.getMinutes() < 10 ? "0" : ""}${d.getMinutes()}`;
}

function randomDigit() {
  return DIGITS[Math.floor(Math.random() * 10)];
}

function randomNumber() {
  const a = `${Math.floor(Math.random() * 8) + 2}${randomDigit()}${randomDigit()}`;
  return `+1 (${a}) 555-${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}`;
}

export default function PhoneSim() {
  const timeRef = useRef<HTMLSpanElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const callOverlayRef = useRef<HTMLDivElement>(null);
  const callFromRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeEl = timeRef.current!;
    const numberEl = numberRef.current!;
    const feed = feedRef.current!;
    const callOverlay = callOverlayRef.current!;
    const callFrom = callFromRef.current!;

    // Clock
    const updateTime = () => { timeEl.textContent = formatTime(new Date()); };
    updateTime();
    const clockInterval = setInterval(updateTime, 30000);

    // Number scramble
    let targetNumber = "+1 (941) 555-0173";
    function scrambleNumber() {
      const chars = targetNumber.split("");
      const positions: number[] = [];
      for (let i = 0; i < chars.length; i++) {
        if (DIGITS.includes(chars[i])) positions.push(i);
      }
      let iterations = 0;
      const maxIterations = 15;
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
          display[idx] = randomDigit();
        }
        numberEl.textContent = display.join("");
        if (settled.length === positions.length) {
          clearInterval(interval);
          numberEl.textContent = targetNumber;
        }
      }, 60);
    }
    scrambleNumber();
    const scrambleInterval = setInterval(() => {
      targetNumber = randomNumber();
      scrambleNumber();
    }, 8000);

    // Message feed
    let msgIndex = 0;
    function addMessage() {
      const m = MESSAGES[msgIndex % MESSAGES.length];
      msgIndex++;
      const el = document.createElement("div");
      el.className = `msg ${m.dir}`;
      const bodyEl = document.createElement("div");
      bodyEl.className = "msg-body";
      bodyEl.textContent = m.body;
      el.appendChild(bodyEl);
      const metaEl = document.createElement("div");
      metaEl.className = "msg-meta";
      const now = new Date();
      metaEl.textContent = `${now.getHours() < 10 ? "0" : ""}${now.getHours()}:${now.getMinutes() < 10 ? "0" : ""}${now.getMinutes()}:${now.getSeconds() < 10 ? "0" : ""}${now.getSeconds()}`;
      el.appendChild(metaEl);
      feed.insertBefore(el, feed.firstChild);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add("visible"));
      });
      while (feed.children.length > MAX_VISIBLE) {
        feed.removeChild(feed.children[feed.children.length - 1]);
      }
    }
    const t1 = setTimeout(() => addMessage(), 500);
    const t2 = setTimeout(() => addMessage(), 1200);
    const t3 = setTimeout(() => addMessage(), 2000);
    const feedInterval = setInterval(addMessage, 4000);

    // Call overlay
    function showCall() {
      callFrom.textContent = CALLERS[Math.floor(Math.random() * CALLERS.length)];
      callOverlay.classList.add("active");
      setTimeout(() => callOverlay.classList.remove("active"), 3500);
    }
    const callTimeout = setTimeout(showCall, 12000);
    const callInterval = setInterval(showCall, 25000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(scrambleInterval);
      clearInterval(feedInterval);
      clearInterval(callInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(callTimeout);
    };
  }, []);

  return (
    <div className="iphone">
      <div className="iphone-screen">
        <div className="dynamic-island" />
        <div className="iphone-status">
          <span className="time" ref={timeRef}>12:00</span>
          <StatusIcons />
        </div>
        <div className="app-area">
          <div className="app-header">
            <span className="app-title">AgentNumber</span>
            <span className="app-badge">Live</span>
          </div>
          <div className="app-divider" />
          <div className="number-display">
            <div className="label">Your Agent&apos;s Number</div>
            <div className="number" ref={numberRef}>+1 (941) 555-0173</div>
            <div className="sub">Active &bull; SMS + Voice</div>
          </div>
          <div className="app-divider" />
          <div className="feed-area">
            <div className="feed-label">
              <span className="feed-dot" /> Live Feed
            </div>
            <div ref={feedRef} />
          </div>
          <div className="home-indicator">
            <div className="home-bar" />
          </div>
        </div>
        <div className="call-overlay" ref={callOverlayRef}>
          <div className="call-label">Incoming Call</div>
          <div className="call-ring">
            <span className="call-icon">&#9742;</span>
          </div>
          <div className="call-number" ref={callFromRef}>+1 (212) 555-0044</div>
          <div className="call-status">Ringing...</div>
          <div className="call-actions">
            <div className="call-btn decline">&#10006;</div>
            <div className="call-btn accept">&#9742;</div>
          </div>
        </div>
      </div>
    </div>
  );
}
