import { createServer } from "http";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import WebSocket from "ws";

const PORT = 3002;
const GATEWAY_URL = "ws://127.0.0.1:18785/";
const GATEWAY_TOKEN = "2486df6422ee6667314c3973477e6ffcf496f02de6b7e9a8";
const AGENT_ID = "main";
const SESSION_KEY = "agent:main:phone";
const MEMORY_FILE = "/Users/dannyren/.openclaw/workspace/MEMORY.md";

const VOICE_RULES = `You are on a LIVE PHONE CALL right now. This is real-time voice, not text chat.

RULES:
1. MAX 1-2 sentences per response. Brevity is critical.
2. Sound natural — like a person on the phone. No lists, no markdown, no formatting.
3. NEVER use tools, file reads, searches, or analysis. Just talk from memory.
4. Be conversational. Ask short follow-ups instead of monologuing.
5. If you don't know something, just say so in a few words.
6. Never repeat yourself or re-introduce yourself.
7. Match the caller's energy and keep it casual.`;

const SMS_RULES = `You are replying to an SMS text message. This is async text, not voice.

RULES:
1. Keep responses under 320 characters (2 SMS segments) unless more detail is needed.
2. No markdown, no formatting, no bullet points. Plain text only.
3. NEVER use tools, file reads, searches, or analysis. Just reply from memory.
4. Be conversational and natural. Match the sender's tone.
5. If you don't know something, say so briefly.
6. Never repeat yourself or re-introduce yourself.`;

function loadVoicePrompt() {
  let memory = "";
  try {
    memory = readFileSync(MEMORY_FILE, "utf-8");
  } catch {
    memory = "You are Yambot, an autonomous CS2 prediction agent built by Danny.";
  }
  return `${memory}\n\n---\n\n${VOICE_RULES}`;
}

// ─── Persistent WebSocket Connection to OpenClaw ───

let ws = null;
let connected = false;
let reqIdCounter = 0;

// Map of runId -> run object with event buffer + callbacks
const pendingRuns = new Map();
// Map of reqId -> { resolve, reject }
const pendingReqs = new Map();

function nextReqId() {
  return `r${++reqIdCounter}`;
}

function connectGateway() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  console.log("[ws] Connecting to OpenClaw gateway...");
  ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    console.log("[ws] Connected, waiting for challenge...");
  });

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    // Handle challenge -> send connect handshake
    if (msg.type === "event" && msg.event === "connect.challenge") {
      console.log("[ws] Received challenge, sending auth...");
      const connectReq = {
        type: "req",
        id: nextReqId(),
        method: "connect",
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: "gateway-client",
            displayName: "voice-bridge",
            version: "1.0.0",
            platform: "node",
            mode: "backend",
          },
          auth: { token: GATEWAY_TOKEN },
          role: "operator",
          scopes: ["operator.read", "operator.write"],
        },
      };
      ws.send(JSON.stringify(connectReq));
      return;
    }

    // Handle connect response (hello-ok)
    if (msg.type === "res" && msg.ok && msg.payload?.type === "hello-ok") {
      connected = true;
      console.log(`[ws] Authenticated! Protocol v${msg.payload.protocol}, server v${msg.payload.server.version}`);
      return;
    }

    // Handle request responses (ack for chat.send)
    if (msg.type === "res" && msg.id) {
      const pending = pendingReqs.get(msg.id);
      if (pending) {
        pendingReqs.delete(msg.id);
        if (msg.ok) {
          pending.resolve(msg.payload);
        } else {
          console.error(`[ws] Request ${msg.id} failed:`, JSON.stringify(msg.error));
          pending.reject(new Error(msg.error?.message || "Request failed"));
        }
      }
      return;
    }

    // Handle streaming chat events
    if (msg.type === "event" && msg.event === "chat") {
      const { runId, state, message: chatMsg } = msg.payload || {};
      console.log(`[ws] chat event: runId=${runId} state=${state} hasMsg=${!!chatMsg}`);

      const run = pendingRuns.get(runId);
      if (!run) {
        console.log(`[ws]   -> no pending run for this runId, ignoring`);
        return;
      }

      if (state === "delta") {
        const text = chatMsg ? extractText(chatMsg) : "";
        console.log(`[ws]   -> delta text: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
        if (text) {
          run.pushDelta(text);
        }
      } else if (state === "final") {
        const text = chatMsg ? extractText(chatMsg) : "";
        console.log(`[ws]   -> final text: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
        run.pushFinal(text);
      } else if (state === "error") {
        console.error(`[ws]   -> error: ${msg.payload?.errorMessage}`);
        run.pushError(msg.payload?.errorMessage || "Agent error");
      } else if (state === "aborted") {
        console.warn(`[ws]   -> aborted`);
        run.pushError("Agent run aborted");
      }
      return;
    }

    // Log agent events (tool calls etc) for debugging
    if (msg.type === "event" && msg.event === "agent") {
      const { runId, stream: streamType } = msg.payload || {};
      console.log(`[ws] agent event: runId=${runId} stream=${streamType}`);
      return;
    }

    // Ignore tick events
    if (msg.type === "event" && msg.event === "tick") return;

    // Log anything unexpected
    console.log(`[ws] unhandled: ${msg.type}/${msg.event || msg.method || "?"}`);
  });

  ws.on("close", () => {
    console.log("[ws] Disconnected from gateway");
    connected = false;
    for (const [, run] of pendingRuns) {
      run.pushError("WebSocket disconnected");
    }
    pendingRuns.clear();
    for (const [, req] of pendingReqs) {
      req.reject(new Error("WebSocket disconnected"));
    }
    pendingReqs.clear();
    setTimeout(connectGateway, 2000);
  });

  ws.on("error", (err) => {
    console.error("[ws] Error:", err.message);
  });
}

function extractText(chatMsg) {
  if (!chatMsg) return "";
  if (typeof chatMsg.content === "string") return chatMsg.content;
  if (Array.isArray(chatMsg.content)) {
    return chatMsg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  }
  return "";
}

function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !connected) {
      reject(new Error("Not connected to gateway"));
      return;
    }
    const id = nextReqId();
    pendingReqs.set(id, { resolve, reject });
    ws.send(JSON.stringify({ type: "req", id, method, params }));
    setTimeout(() => {
      if (pendingReqs.has(id)) {
        pendingReqs.delete(id);
        reject(new Error("Request timeout"));
      }
    }, 5000);
  });
}

// Creates a run object that buffers events and replays them when callbacks are attached.
// This fixes the race condition where events arrive before handlers are set up.
function createRun(runId) {
  const bufferedEvents = [];
  let deltaHandler = null;
  let finalHandler = null;
  let errorHandler = null;
  let done = false;

  function flush() {
    while (bufferedEvents.length > 0 && (deltaHandler || finalHandler || errorHandler)) {
      const evt = bufferedEvents.shift();
      if (evt.type === "delta" && deltaHandler) {
        deltaHandler(evt.text);
      } else if (evt.type === "final" && finalHandler) {
        finalHandler(evt.text);
        done = true;
      } else if (evt.type === "error" && errorHandler) {
        errorHandler(evt.message);
        done = true;
      } else {
        // Put it back if no handler yet
        bufferedEvents.unshift(evt);
        break;
      }
    }
  }

  const run = {
    runId,
    pushDelta(text) {
      if (done) return;
      if (deltaHandler) {
        deltaHandler(text);
      } else {
        bufferedEvents.push({ type: "delta", text });
      }
    },
    pushFinal(text) {
      if (done) return;
      if (finalHandler) {
        finalHandler(text);
        done = true;
      } else {
        bufferedEvents.push({ type: "final", text });
      }
    },
    pushError(message) {
      if (done) return;
      if (errorHandler) {
        errorHandler(message);
        done = true;
      } else {
        bufferedEvents.push({ type: "error", message });
      }
    },
    setHandlers(onDelta, onFinal, onError) {
      deltaHandler = onDelta;
      finalHandler = onFinal;
      errorHandler = onError;
      flush();
    },
  };

  pendingRuns.set(runId, run);
  return run;
}

// ─── HTTP Server (Vapi webhook) ───

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", connected, agent: AGENT_ID, session: SESSION_KEY }));
    return;
  }

  // ─── SMS endpoint ───
  if (req.method === "POST" && req.url === "/sms") {
    let body = "";
    for await (const chunk of req) body += chunk;

    let parsed;
    try { parsed = JSON.parse(body); } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const { from: senderNumber, body: messageBody } = parsed;
    if (!senderNumber || !messageBody) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "from and body are required" }));
      return;
    }

    console.log(`\n[${new Date().toISOString()}] SMS from ${senderNumber}: "${messageBody}"`);

    if (!connected) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Agent not connected" }));
      return;
    }

    // Per-sender session so each person gets their own conversation thread
    const smsSessionKey = `agent:${AGENT_ID}:sms:${senderNumber}`;

    try {
      const ack = await sendRequest("agent", {
        agentId: AGENT_ID,
        sessionKey: smsSessionKey,
        message: messageBody,
        idempotencyKey: randomUUID(),
        thinking: "off",
        extraSystemPrompt: SMS_RULES,
      });

      const runId = ack.runId;
      const run = createRun(runId);
      const t0 = Date.now();

      // Non-streaming — collect full response
      let fullText = "";
      run.setHandlers(
        (text) => { fullText = text; },
        (text) => {
          if (text) fullText = text;
          console.log(`[sms] Agent (${Date.now() - t0}ms): "${fullText}"`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ body: fullText }));
          pendingRuns.delete(runId);
        },
        (err) => {
          console.error(`[sms] Agent error: ${err}`);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err }));
          pendingRuns.delete(runId);
        }
      );

      setTimeout(() => {
        if (!res.writableEnded) {
          pendingRuns.delete(runId);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ body: fullText || "Sorry, I took too long to respond." }));
        }
      }, 30000);
    } catch (err) {
      console.error("[sms] Error:", err.message);
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
      if (!res.writableEnded) res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ─── Voice endpoint (Vapi OpenAI-compatible) ───
  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const messages = parsed.messages || [];
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const userText = lastUserMsg?.content || "";

    if (!userText) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No user message found" }));
      return;
    }

    const reqTime = Date.now();
    console.log(`\n[${new Date().toISOString()}] User: "${userText}"`);

    if (!connected) {
      console.error("[call] Not connected to gateway!");
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Agent gateway not connected" }));
      return;
    }

    try {
      // Send the message and get the runId
      const idempotencyKey = randomUUID();
      const ack = await sendRequest("agent", {
        agentId: AGENT_ID,
        sessionKey: SESSION_KEY,
        message: userText,
        idempotencyKey,
        thinking: "off",
        extraSystemPrompt: loadVoicePrompt(),
      });

      const runId = ack.runId;
      console.log(`[call] runId=${runId} ack_latency=${Date.now() - reqTime}ms`);

      // Create the run object IMMEDIATELY (before any events can arrive)
      // Actually the run was already created before sendRequest returns...
      // Let's create it right after we get the runId
      const run = createRun(runId);

      if (parsed.stream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        let sentLength = 0; // Track how much text we've already sent
        let fullResponse = "";
        let firstDeltaTime = null;

        run.setHandlers(
          // onDelta — deltas are CUMULATIVE (full text so far), send only the new part
          (text) => {
            if (!firstDeltaTime) {
              firstDeltaTime = Date.now();
              console.log(`[call] First delta after ${firstDeltaTime - reqTime}ms`);
            }
            const newPart = text.slice(sentLength);
            if (newPart) {
              sentLength = text.length;
              fullResponse = text;
              const chunk = {
                id: `chatcmpl-${runId}`,
                object: "chat.completion.chunk",
                choices: [{ index: 0, delta: { content: newPart }, finish_reason: null }],
              };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
          },
          // onFinal — also cumulative, send any remaining text
          (text) => {
            if (text) {
              const remaining = text.slice(sentLength);
              if (remaining) {
                const chunk = {
                  id: `chatcmpl-${runId}`,
                  object: "chat.completion.chunk",
                  choices: [{ index: 0, delta: { content: remaining }, finish_reason: null }],
                };
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              }
              fullResponse = text;
            }
            console.log(`[call] Agent (${Date.now() - reqTime}ms): "${fullResponse}"`);
            res.write(`data: ${JSON.stringify({ id: `chatcmpl-${runId}`, object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
            pendingRuns.delete(runId);
          },
          // onError
          (err) => {
            console.error(`[call] Agent error (${Date.now() - reqTime}ms): ${err}`);
            const chunk = {
              id: `chatcmpl-${runId}`,
              object: "chat.completion.chunk",
              choices: [{ index: 0, delta: { content: "Sorry, I'm having trouble right now." }, finish_reason: null }],
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            res.write(`data: ${JSON.stringify({ id: `chatcmpl-${runId}`, object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
            pendingRuns.delete(runId);
          }
        );

        // Timeout: 30s
        setTimeout(() => {
          if (!res.writableEnded) {
            console.warn(`[call] Timeout for runId=${runId} after 30s`);
            pendingRuns.delete(runId);
            res.write(`data: ${JSON.stringify({ id: `chatcmpl-${runId}`, object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
          }
        }, 30000);
      } else {
        // Non-streaming
        let fullText = "";
        run.setHandlers(
          (text) => { fullText = text; }, // Cumulative — just replace
          (text) => {
            if (text) fullText = text;
            console.log(`[call] Agent (${Date.now() - reqTime}ms): "${fullText}"`);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              id: `chatcmpl-${runId}`,
              object: "chat.completion",
              choices: [{ index: 0, message: { role: "assistant", content: fullText }, finish_reason: "stop" }],
            }));
            pendingRuns.delete(runId);
          },
          (err) => {
            console.error(`[call] Agent error: ${err}`);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Agent error: " + err }));
            pendingRuns.delete(runId);
          }
        );

        setTimeout(() => {
          if (!res.writableEnded) {
            pendingRuns.delete(runId);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              id: `chatcmpl-${runId}`,
              object: "chat.completion",
              choices: [{ index: 0, message: { role: "assistant", content: fullText || "Sorry, I took too long." }, finish_reason: "stop" }],
            }));
          }
        }, 30000);
      }
    } catch (err) {
      console.error("[call] Error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
      }
      if (!res.writableEnded) {
        res.end(JSON.stringify({ error: "Agent unavailable: " + err.message }));
      }
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

// ─── Start ───

connectGateway();

server.listen(PORT, () => {
  console.log(`\nVoice bridge running on http://localhost:${PORT}`);
  console.log(`Gateway: ${GATEWAY_URL}`);
  console.log(`Session: ${SESSION_KEY}`);
  console.log(`\nWaiting for WebSocket connection...\n`);
});
