"use client";

import { useEffect, useRef } from "react";

const DIGITS = "0123456789";

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

export default function TelegramDemo() {
  const tgTimeRef = useRef<HTMLSpanElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLDivElement>(null);
  const callBannerRef = useRef<HTMLDivElement>(null);
  const popRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tgTimeEl = tgTimeRef.current!;
    const chat = chatRef.current!;
    const typing = typingRef.current!;
    const callBanner = callBannerRef.current!;
    const pops = popRefs.current;

    tgTimeEl.textContent = formatTime(new Date());
    let loopCount = 0;
    let sequenceTimeouts: ReturnType<typeof setTimeout>[] = [];

    function addBubble(side: string, html: string, isKey?: boolean) {
      const bubble = document.createElement("div");
      bubble.className = `tg-bubble ${side}`;
      if (isKey) {
        const textNode = document.createElement("span");
        textNode.textContent = "Here\u2019s my AgentNumber API key:";
        bubble.appendChild(textNode);
        bubble.appendChild(document.createElement("br"));
        const keySpan = document.createElement("span");
        keySpan.className = "tg-key";
        keySpan.textContent = "an_sk_7f3k2mX9pL4nR8wQ...";
        bubble.appendChild(keySpan);
      } else {
        bubble.appendChild(document.createTextNode(html));
      }
      const timeSpan = document.createElement("div");
      timeSpan.className = "tg-time";
      timeSpan.textContent = formatTime(new Date());
      bubble.appendChild(timeSpan);
      chat.insertBefore(bubble, typing);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => bubble.classList.add("visible"));
      });
    }

    function showTyping() { typing.classList.add("visible"); }
    function hideTyping() { typing.classList.remove("visible"); }
    function showPop(i: number) { pops[i]?.classList.add("visible"); }
    function hideAllPops() { pops.forEach(p => p?.classList.remove("visible")); }
    function clearChat() {
      chat.querySelectorAll(".tg-bubble").forEach(b => b.remove());
    }

    function runSequence() {
      loopCount++;
      if (loopCount > 1) { clearChat(); hideAllPops(); }

      const ac = `${Math.floor(Math.random() * 8) + 2}${randomDigit()}${randomDigit()}`;
      const last4 = `${randomDigit()}${randomDigit()}${randomDigit()}${randomDigit()}`;
      const phoneNum = `+1 (${ac}) 555-${last4}`;

      sequenceTimeouts = [];

      sequenceTimeouts.push(setTimeout(() => {
        addBubble("user", "", true);
        showPop(0);
      }, 1000));

      sequenceTimeouts.push(setTimeout(() => showTyping(), 2500));

      sequenceTimeouts.push(setTimeout(() => {
        hideTyping();
        addBubble("bot", "Got it! Provisioning your number now...");
        showPop(1);
      }, 4500));

      sequenceTimeouts.push(setTimeout(() => showTyping(), 6000));

      sequenceTimeouts.push(setTimeout(() => {
        hideTyping();
        const bubble = document.createElement("div");
        bubble.className = "tg-bubble bot";
        bubble.appendChild(document.createTextNode("Done! My number is "));
        const numSpan = document.createElement("span");
        numSpan.className = "tg-number";
        numSpan.textContent = phoneNum;
        bubble.appendChild(numSpan);
        bubble.appendChild(document.createElement("br"));
        bubble.appendChild(document.createTextNode("Calling you now!"));
        const timeSpan = document.createElement("div");
        timeSpan.className = "tg-time";
        timeSpan.textContent = formatTime(new Date());
        bubble.appendChild(timeSpan);
        chat.insertBefore(bubble, typing);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => bubble.classList.add("visible"));
        });
        showPop(2);
      }, 8000));

      sequenceTimeouts.push(setTimeout(() => {
        callBanner.classList.add("visible");
        showPop(3);
      }, 9500));

      sequenceTimeouts.push(setTimeout(() => {
        callBanner.classList.remove("visible");
      }, 13000));

      sequenceTimeouts.push(setTimeout(() => hideAllPops(), 15000));

      sequenceTimeouts.push(setTimeout(runSequence, 17000));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          runSequence();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      sequenceTimeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="demo-wrap">
      {/* Pop-out callouts */}
      <div className="pop left" ref={el => { popRefs.current[0] = el; }} style={{ top: "22%" }}>
        <span className="pop-highlight">SEND YOUR KEY</span>
        <span className="pop-line">Agent receives API credentials via chat</span>
      </div>
      <div className="pop right" ref={el => { popRefs.current[1] = el; }} style={{ top: "34%" }}>
        <span className="pop-highlight">PROVISIONING</span>
        <span className="pop-line">Agent calls AgentNumber API automatically</span>
      </div>
      <div className="pop left" ref={el => { popRefs.current[2] = el; }} style={{ top: "46%" }}>
        <span className="pop-highlight">NUMBER ASSIGNED</span>
        <span className="pop-line">Real US phone number, ready in seconds</span>
      </div>
      <div className="pop right" ref={el => { popRefs.current[3] = el; }} style={{ top: "58%" }}>
        <span className="pop-highlight">INCOMING CALL</span>
        <span className="pop-line">Agent calls you from its new number</span>
      </div>

      <div className="tg-iphone" ref={containerRef}>
        <div className="tg-screen">
          <div className="dynamic-island" />
          <div className="tg-status">
            <span className="time" ref={tgTimeRef}>12:00</span>
            <StatusIcons />
          </div>
          <div className="tg-nav">
            <span className="tg-back">&#8249;</span>
            <div className="tg-avatar">OC</div>
            <div className="tg-contact">
              <div className="tg-contact-name">OpenClaw Agent</div>
              <div className="tg-contact-status">online</div>
            </div>
          </div>
          <div className="tg-chat" ref={chatRef}>
            <div className="tg-typing" ref={typingRef}>
              <span /><span /><span />
            </div>
          </div>
          <div className="tg-input">
            <div className="tg-input-field">Message</div>
            <div className="tg-input-send">&#9650;</div>
          </div>
          <div className="tg-call-banner" ref={callBannerRef}>
            <div className="tg-call-banner-icon">&#9742;</div>
            <div className="tg-call-banner-info">
              <div className="tg-call-banner-name">OpenClaw Agent</div>
              <div className="tg-call-banner-sub">Incoming Voice Call...</div>
            </div>
            <div className="tg-call-banner-actions">
              <div className="tg-call-btn decline">&#10006;</div>
              <div className="tg-call-btn accept">&#9742;</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
