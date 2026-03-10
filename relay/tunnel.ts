#!/usr/bin/env node

import WebSocket from "ws";
import { randomUUID } from "crypto";

// ─── CLI Args ───

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const token = getArg("token");
const relayUrl = getArg("relay") || "wss://agentnumber-relay.fly.dev/tunnel";
const gatewayUrl = getArg("gateway") || "ws://localhost:18785";

if (!token) {
  console.error("Usage: npx @agentnumber/tunnel --token <gateway_token>");
  console.error("Options:");
  console.error("  --token    Gateway token (required)");
  console.error("  --relay    Relay URL (default: wss://relay.agentnumber.com/tunnel)");
  console.error("  --gateway  Local gateway URL (default: ws://localhost:18785)");
  process.exit(1);
}

// ─── State ───

let reconnectDelay = 2000;
const MAX_RECONNECT_DELAY = 30000;
let shouldReconnect = true;

// ─── Connect ───

function connect() {
  console.log(`Connecting to ${relayUrl}...`);
  const ws = new WebSocket(relayUrl);

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "auth", token }));
  });

  ws.on("message", (data) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === "auth_ok") {
      console.log("Authenticated. Tunnel active.");
      console.log("Your OpenClaw gateway is now reachable via AgentNumber.");
      reconnectDelay = 2000; // Reset backoff on successful auth
      return;
    }

    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (msg.type === "request") {
      handleRequest(ws, msg as {
        type: string;
        id: string;
        agentId: string;
        sessionKey: string;
        message: string;
        extraSystemPrompt?: string;
      });
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`Disconnected (${code}: ${reason.toString() || "unknown"})`);
    if (shouldReconnect) {
      console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }
  });

  ws.on("error", (err) => {
    console.error(`Connection error: ${err.message}`);
  });
}

// ─── Handle Request via Local OpenClaw Gateway ───

function handleRequest(
  relayWs: WebSocket,
  req: { id: string; agentId: string; sessionKey: string; message: string; extraSystemPrompt?: string }
) {
  let reqIdCounter = 0;
  let runId: string | null = null;
  let authenticated = false;
  let settled = false;

  const nextReqId = () => `r${++reqIdCounter}`;
  const localWs = new WebSocket(gatewayUrl);

  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      localWs.close();
      relayWs.send(JSON.stringify({ type: "error", id: req.id, message: "Local gateway timeout" }));
    }
  }, 60000);

  function finish() {
    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      localWs.close();
    }
  }

  localWs.on("error", (err) => {
    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      relayWs.send(JSON.stringify({ type: "error", id: req.id, message: `Local gateway error: ${err.message}` }));
    }
  });

  localWs.on("close", () => {
    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      relayWs.send(JSON.stringify({ type: "error", id: req.id, message: "Local gateway disconnected" }));
    }
  });

  localWs.on("message", (data) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    // Challenge → auth
    if (msg.type === "event" && msg.event === "connect.challenge") {
      localWs.send(JSON.stringify({
        type: "req",
        id: nextReqId(),
        method: "connect",
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: "gateway-client",
            displayName: "AgentNumber Tunnel",
            version: "1.0.0",
            platform: "node",
            mode: "backend",
          },
          auth: { token },
          role: "operator",
          scopes: ["operator.read", "operator.write"],
        },
      }));
      return;
    }

    // Auth response
    const payload = msg.payload as Record<string, unknown> | undefined;
    if (msg.type === "res" && msg.ok && payload?.type === "hello-ok") {
      authenticated = true;
      localWs.send(JSON.stringify({
        type: "req",
        id: nextReqId(),
        method: "agent",
        params: {
          agentId: req.agentId,
          sessionKey: req.sessionKey,
          message: req.message,
          idempotencyKey: randomUUID(),
          thinking: "off",
          extraSystemPrompt: req.extraSystemPrompt,
        },
      }));
      return;
    }

    // Agent request ack → extract runId
    if (msg.type === "res" && msg.ok && msg.id && !runId && authenticated) {
      runId = (payload as Record<string, unknown>)?.runId as string;
      return;
    }

    // Auth/request error
    if (msg.type === "res" && !msg.ok) {
      const error = msg.error as Record<string, unknown> | undefined;
      relayWs.send(JSON.stringify({
        type: "error",
        id: req.id,
        message: (error?.message as string) || "Gateway request failed",
      }));
      finish();
      return;
    }

    // Chat events → forward to relay
    if (msg.type === "event" && msg.event === "chat" && payload) {
      const eventRunId = payload.runId as string;
      if (runId && eventRunId !== runId) return;

      const state = payload.state as string;
      const chatMsg = payload.message as { content?: string | Array<{ type: string; text?: string }> } | null;

      if (state === "delta") {
        const text = extractText(chatMsg);
        if (text) {
          relayWs.send(JSON.stringify({ type: "delta", id: req.id, text }));
        }
      } else if (state === "final") {
        const text = extractText(chatMsg);
        relayWs.send(JSON.stringify({ type: "final", id: req.id, text }));
        finish();
      } else if (state === "error" || state === "aborted") {
        relayWs.send(JSON.stringify({
          type: "error",
          id: req.id,
          message: (payload.errorMessage as string) || "Agent error",
        }));
        finish();
      }
    }
  });
}

function extractText(chatMsg: { content?: string | Array<{ type: string; text?: string }> } | null): string {
  if (!chatMsg) return "";
  if (typeof chatMsg.content === "string") return chatMsg.content;
  if (Array.isArray(chatMsg.content)) {
    return chatMsg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text || "")
      .join("");
  }
  return "";
}

// ─── Graceful Shutdown ───

process.on("SIGINT", () => {
  shouldReconnect = false;
  console.log("\nShutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  shouldReconnect = false;
  process.exit(0);
});

// ─── Start ───

connect();
