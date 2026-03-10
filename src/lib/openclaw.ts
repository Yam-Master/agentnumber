import WebSocket from "ws";
import { randomUUID } from "crypto";

interface OpenClawConfig {
  gatewayUrl: string;
  gatewayToken: string;
  agentId: string;
  sessionKey: string;
}

interface OpenClawParams {
  message: string;
  extraSystemPrompt?: string;
}

interface OpenClawCallbacks {
  onDelta: (cumulativeText: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
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

export function isRelayUrl(url: string): boolean {
  return url.startsWith("https://relay.") || url.startsWith("http://relay.");
}

export function openClawRequest(
  config: OpenClawConfig,
  params: OpenClawParams,
  callbacks: OpenClawCallbacks,
  timeoutMs = 55000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let reqIdCounter = 0;
    let runId: string | null = null;
    let authenticated = false;

    const nextReqId = () => `r${++reqIdCounter}`;

    // Normalize ws:// or wss:// URLs
    const wsUrl = config.gatewayUrl.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
    const ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        callbacks.onError("Gateway timeout");
        resolve();
      }
    }, timeoutMs);

    function finish() {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    }

    ws.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        callbacks.onError(`Gateway connection error: ${err.message}`);
        resolve();
      }
    });

    ws.on("close", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        callbacks.onError("Gateway disconnected");
        resolve();
      }
    });

    ws.on("message", (data) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      // Challenge → send auth
      if (msg.type === "event" && msg.event === "connect.challenge") {
        ws.send(JSON.stringify({
          type: "req",
          id: nextReqId(),
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "gateway-client",
              displayName: "AgentNumber Managed Bridge",
              version: "1.0.0",
              platform: "node",
              mode: "backend",
            },
            auth: { token: config.gatewayToken },
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
        // Send agent request
        const agentReqId = nextReqId();
        ws.send(JSON.stringify({
          type: "req",
          id: agentReqId,
          method: "agent",
          params: {
            agentId: config.agentId,
            sessionKey: config.sessionKey,
            message: params.message,
            idempotencyKey: randomUUID(),
            thinking: "off",
            extraSystemPrompt: params.extraSystemPrompt,
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
        callbacks.onError(error?.message as string || "Gateway request failed");
        finish();
        return;
      }

      // Chat events
      if (msg.type === "event" && msg.event === "chat" && payload) {
        const eventRunId = payload.runId as string;
        if (runId && eventRunId !== runId) return;

        const state = payload.state as string;
        const chatMsg = payload.message as { content?: string | Array<{ type: string; text?: string }> } | null;

        if (state === "delta") {
          const text = extractText(chatMsg);
          if (text) callbacks.onDelta(text);
        } else if (state === "final") {
          const text = extractText(chatMsg);
          callbacks.onFinal(text);
          finish();
        } else if (state === "error" || state === "aborted") {
          callbacks.onError((payload.errorMessage as string) || "Agent error");
          finish();
        }
      }
    });
  });
}
