---
name: agentnumber
description: Give your agent a phone number. Use when the user wants to set up voice calling, get a phone number for their agent, or enable their agent to make/receive phone calls via AgentNumber.
metadata:
  {
    "clawdbot":
      {
        "emoji": "📞",
        "homepage": "https://agentnumber.dev",
        "requires": { "bins": ["node", "ngrok"] },
      },
  }
---

# AgentNumber — Give Your Agent a Phone Number

People call a real phone number and talk to YOU — same personality, same memory, same skills. The phone call runs in its own conversation thread but you share the same memory file, so anything you learn on a call is available in Discord and vice versa.

## What You Need From Your Operator

Before starting, ask your operator for:
1. **AgentNumber API key** — format: `an_live_<32 hex chars>`. Get one from the AgentNumber dashboard.

That's it. Everything else you can read from your own config.

## Setup Steps

You (the agent) should execute these steps yourself. Do them in order.

### 1. Read Your Own Config

Read `~/.openclaw/openclaw.json` and extract:
- Your agent ID from `agents.list` (look for your own entry — probably `"main"`)
- Gateway port from `gateway.port` (default 18785)
- Gateway auth token from `gateway.auth.token`

Store these for the next step:
```
AGENT_ID=<your agent id>
GATEWAY_URL=ws://127.0.0.1:<port>/
GATEWAY_TOKEN=<token>
```

### 2. Create the Voice Bridge

Create a directory called `voice-bridge` in your workspace, then:

```bash
cd voice-bridge && npm init -y && npm install ws
```

Write `voice-bridge/server.mjs` with the content below. **Replace the 3 config values** at the top with what you read in step 1:

```javascript
import { createServer } from "http";
import { randomUUID } from "crypto";
import WebSocket from "ws";

// ─── CONFIG: Fill these from your openclaw.json ───
const PORT = 3002;
const GATEWAY_URL = "ws://127.0.0.1:18785/";  // gateway.port
const GATEWAY_TOKEN = "YOUR_TOKEN_HERE";        // gateway.auth.token
const AGENT_ID = "main";                        // your agent id
const SESSION_KEY = `agent:${AGENT_ID}:phone`;

const VOICE_RULES = `You are on a LIVE PHONE CALL right now. This is real-time voice, not text chat.

RULES:
1. MAX 1-2 sentences per response. Brevity is critical.
2. Sound natural — like a person on the phone. No lists, no markdown, no formatting.
3. NEVER use tools, file reads, searches, or analysis. Just talk from memory.
4. Be conversational. Ask short follow-ups instead of monologuing.
5. If you don't know something, just say so in a few words.
6. Never repeat yourself or re-introduce yourself.
7. Match the caller's energy and keep it casual.`;

let ws = null;
let connected = false;
let reqIdCounter = 0;
const pendingRuns = new Map();
const pendingReqs = new Map();

function nextReqId() { return `r${++reqIdCounter}`; }

function connectGateway() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  console.log("[ws] Connecting to OpenClaw gateway...");
  ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => console.log("[ws] Connected, waiting for challenge..."));

  ws.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (msg.type === "event" && msg.event === "connect.challenge") {
      ws.send(JSON.stringify({
        type: "req", id: nextReqId(), method: "connect",
        params: {
          minProtocol: 3, maxProtocol: 3,
          client: { id: "gateway-client", displayName: "voice-bridge", version: "1.0.0", platform: "node", mode: "backend" },
          auth: { token: GATEWAY_TOKEN }, role: "operator", scopes: ["operator.read", "operator.write"],
        },
      }));
      return;
    }

    if (msg.type === "res" && msg.ok && msg.payload?.type === "hello-ok") {
      connected = true;
      console.log(`[ws] Authenticated! Protocol v${msg.payload.protocol}`);
      return;
    }

    if (msg.type === "res" && msg.id) {
      const pending = pendingReqs.get(msg.id);
      if (pending) {
        pendingReqs.delete(msg.id);
        msg.ok ? pending.resolve(msg.payload) : pending.reject(new Error(msg.error?.message || "Request failed"));
      }
      return;
    }

    if (msg.type === "event" && msg.event === "chat") {
      const { runId, state, message: chatMsg } = msg.payload || {};
      const run = pendingRuns.get(runId);
      if (!run) return;
      if (state === "delta") { const t = extractText(chatMsg); if (t) run.pushDelta(t); }
      else if (state === "final") run.pushFinal(extractText(chatMsg));
      else if (state === "error") run.pushError(msg.payload?.errorMessage || "Agent error");
      else if (state === "aborted") run.pushError("Aborted");
      return;
    }

    if (msg.type === "event" && (msg.event === "agent" || msg.event === "tick" || msg.event === "health")) return;
  });

  ws.on("close", () => {
    connected = false;
    for (const [, r] of pendingRuns) r.pushError("Disconnected");
    pendingRuns.clear();
    for (const [, r] of pendingReqs) r.reject(new Error("Disconnected"));
    pendingReqs.clear();
    setTimeout(connectGateway, 2000);
  });

  ws.on("error", (err) => console.error("[ws] Error:", err.message));
}

function extractText(m) {
  if (!m) return "";
  if (typeof m.content === "string") return m.content;
  if (Array.isArray(m.content)) return m.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return "";
}

function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !connected) { reject(new Error("Not connected")); return; }
    const id = nextReqId();
    pendingReqs.set(id, { resolve, reject });
    ws.send(JSON.stringify({ type: "req", id, method, params }));
    setTimeout(() => { if (pendingReqs.has(id)) { pendingReqs.delete(id); reject(new Error("Timeout")); } }, 5000);
  });
}

function createRun(runId) {
  const buf = [];
  let dH = null, fH = null, eH = null, done = false;
  function flush() {
    while (buf.length > 0 && (dH || fH || eH)) {
      const e = buf.shift();
      if (e.t === "d" && dH) dH(e.v);
      else if (e.t === "f" && fH) { fH(e.v); done = true; }
      else if (e.t === "e" && eH) { eH(e.v); done = true; }
      else { buf.unshift(e); break; }
    }
  }
  const run = {
    pushDelta(t) { if (done) return; dH ? dH(t) : buf.push({ t: "d", v: t }); },
    pushFinal(t) { if (done) return; fH ? (fH(t), done = true) : buf.push({ t: "f", v: t }); },
    pushError(m) { if (done) return; eH ? (eH(m), done = true) : buf.push({ t: "e", v: m }); },
    setHandlers(d, f, e) { dH = d; fH = f; eH = e; flush(); },
  };
  pendingRuns.set(runId, run);
  return run;
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", connected, agent: AGENT_ID }));
    return;
  }

  if (req.method !== "POST") { res.writeHead(404); res.end("Not found"); return; }

  let body = "";
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end('{"error":"Invalid JSON"}'); return; }

  const userText = (parsed.messages || []).filter((m) => m.role === "user").pop()?.content || "";
  if (!userText) { res.writeHead(400); res.end('{"error":"No user message"}'); return; }

  console.log(`\n[${new Date().toISOString()}] Caller: "${userText}"`);
  if (!connected) { res.writeHead(503); res.end('{"error":"Agent not connected"}'); return; }

  try {
    const ack = await sendRequest("agent", {
      agentId: AGENT_ID, sessionKey: SESSION_KEY, message: userText,
      idempotencyKey: randomUUID(), thinking: "off", extraSystemPrompt: VOICE_RULES,
    });
    const runId = ack.runId;
    const run = createRun(runId);
    const t0 = Date.now();

    if (parsed.stream) {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      let sent = 0, full = "";
      const chunk = (content, finish) => `data: ${JSON.stringify({ id: `chatcmpl-${runId}`, object: "chat.completion.chunk", choices: [{ index: 0, delta: finish ? {} : { content }, finish_reason: finish ? "stop" : null }] })}\n\n`;

      run.setHandlers(
        (text) => { const p = text.slice(sent); if (p) { sent = text.length; full = text; res.write(chunk(p, false)); } },
        (text) => { if (text) { const r = text.slice(sent); if (r) res.write(chunk(r, false)); full = text; } console.log(`[call] (${Date.now()-t0}ms): "${full}"`); res.write(chunk("", true)); res.write("data: [DONE]\n\n"); res.end(); pendingRuns.delete(runId); },
        (err) => { console.error(`[call] Error: ${err}`); res.write(chunk("Sorry, I'm having trouble right now.", false)); res.write(chunk("", true)); res.write("data: [DONE]\n\n"); res.end(); pendingRuns.delete(runId); }
      );
      setTimeout(() => { if (!res.writableEnded) { pendingRuns.delete(runId); res.write(chunk("", true)); res.write("data: [DONE]\n\n"); res.end(); } }, 30000);
    } else {
      let full = "";
      run.setHandlers(
        (t) => { full = t; },
        (t) => { if (t) full = t; console.log(`[call] (${Date.now()-t0}ms): "${full}"`); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ id: `chatcmpl-${runId}`, object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content: full }, finish_reason: "stop" }] })); pendingRuns.delete(runId); },
        (err) => { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: err })); pendingRuns.delete(runId); }
      );
      setTimeout(() => { if (!res.writableEnded) { pendingRuns.delete(runId); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ id: `chatcmpl-${runId}`, object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content: full || "Sorry, I took too long." }, finish_reason: "stop" }] })); } }, 30000);
    }
  } catch (err) {
    console.error("[call] Error:", err.message);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
    if (!res.writableEnded) res.end(JSON.stringify({ error: err.message }));
  }
});

connectGateway();
server.listen(PORT, () => {
  console.log(`\nVoice bridge running on http://localhost:${PORT}`);
  console.log(`Agent: ${AGENT_ID} | Session: ${SESSION_KEY}`);
  console.log(`Gateway: ${GATEWAY_URL}\n`);
});
```

### 3. Start the Bridge

```bash
cd voice-bridge && node server.mjs
```

You should see:
```
Voice bridge running on http://localhost:3002
[ws] Authenticated! Protocol v3
```

If you see "Error: connect ECONNREFUSED" the OpenClaw gateway isn't running. Tell your operator to run `openclaw gateway start`.

### 4. Start ngrok

In a separate terminal:

```bash
ngrok http 3002
```

This gives you a public HTTPS URL like `https://abc123.ngrok-free.dev`. Copy it.

If ngrok isn't installed: `brew install ngrok`. If it needs auth: `ngrok authtoken <token>` (operator gets this from ngrok.com).

### 5. Provision Your Phone Number

Call the AgentNumber API. Replace `API_KEY` and `NGROK_URL`:

```bash
curl -X POST https://agentnumber.vercel.app/api/v0/numbers \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "<NGROK_URL>",
    "first_message": "Hey, you reached my agent. How can I help?",
    "area_code": "941"
  }'
```

The response gives you your phone number and number ID. Save the number ID (format: `num_...`) — you need it to update the webhook later.

### 6. Save Your Config

Write a file `voice-bridge/config.json` in your workspace so you remember your setup:

```json
{
  "api_key": "an_live_...",
  "number_id": "num_...",
  "phone_number": "+1...",
  "ngrok_url": "https://..."
}
```

### 7. Verify

```bash
curl http://localhost:3002/health
```

Should return `{"status":"ok","connected":true,"agent":"main"}`.

Now call the phone number. You should answer.

## Day-to-Day Usage

After initial setup, you just need two commands in separate terminals:

```bash
# Terminal 1
cd voice-bridge && node server.mjs

# Terminal 2
ngrok http 3002
```

**If ngrok gives you a new URL** (it changes on restart unless you have a paid plan), update your number:

```bash
curl -X PATCH https://agentnumber.vercel.app/api/v0/numbers/<NUMBER_ID> \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "<NEW_NGROK_URL>"}'
```

Update `voice-bridge/config.json` too so you remember the current URL.

## Making Outbound Calls

You can also call people:

```bash
curl -X POST https://agentnumber.vercel.app/api/v0/calls \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"from": "<NUMBER_ID>", "to": "+1XXXXXXXXXX"}'
```

## How It Works

- **Same agent**: The voice bridge talks to your OpenClaw agent (same AGENT_ID)
- **Separate session**: Phone calls get their own conversation thread (`agent:<id>:phone`) so caller messages don't appear in your Discord channels
- **Shared memory**: You read the same MEMORY.md / workspace files, so knowledge carries across Discord and phone
- **Shared skills**: All your skills work on phone too (though VOICE_RULES tells you not to use tools during calls for speed)
- **Voice rules**: An `extraSystemPrompt` is injected on every call telling you to keep responses short and conversational

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Not connected" | OpenClaw gateway isn't running. `openclaw gateway start` |
| ngrok 502 | Voice bridge crashed. Restart `node server.mjs` |
| No response on call | Check bridge logs for errors. Verify `/health` returns `connected: true` |
| Slow responses | `thinking: "off"` is already set. If still slow, the model may be overloaded |
| Webhook URL expired | ngrok restarted. Get new URL and PATCH the number |

## Checking Your Balance and Calls

```bash
# Credits balance
curl https://agentnumber.vercel.app/api/v0/credits/balance \
  -H "Authorization: Bearer <API_KEY>"

# Recent calls
curl https://agentnumber.vercel.app/api/v0/calls \
  -H "Authorization: Bearer <API_KEY>"

# Call transcript
curl https://agentnumber.vercel.app/api/v0/calls/<CALL_ID>/transcript \
  -H "Authorization: Bearer <API_KEY>"
```
