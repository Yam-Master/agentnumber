import { randomUUID } from "crypto";

export interface ManagedBridgeConfig {
  gateway_url: string;
  gateway_token: string;
  agent_id: string;
  voice_rules: string | null;
  sms_rules: string | null;
}

interface RunParams {
  config: ManagedBridgeConfig;
  sessionKey: string;
  message: string;
  mode: "voice" | "sms";
  timeoutMs?: number;
}

const DEFAULT_VOICE_RULES = `You are on a live phone call. Keep responses concise and conversational.
Rules:
1. Keep to 1-2 short sentences.
2. No markdown, bullets, or formatting.
3. No tool calls or external browsing.
4. Match caller tone and ask short follow-ups.`;

const DEFAULT_SMS_RULES = `You are replying via SMS.
Rules:
1. Keep replies under 320 characters unless needed.
2. Plain text only, no markdown.
3. Be concise and conversational.`;

function getRules(mode: "voice" | "sms", cfg: ManagedBridgeConfig): string {
  if (mode === "voice") return cfg.voice_rules || DEFAULT_VOICE_RULES;
  return cfg.sms_rules || DEFAULT_SMS_RULES;
}

function extractText(chatMsg: unknown): string {
  if (!chatMsg || typeof chatMsg !== "object") return "";
  const msg = chatMsg as { content?: unknown };
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((b): b is { type: string; text: string } =>
        typeof b === "object" && b !== null && (b as { type?: unknown }).type === "text"
      )
      .map((b) => b.text)
      .join("");
  }
  return "";
}

function parseJsonSafe(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function runManagedBridge(params: RunParams): Promise<string> {
  const { config, sessionKey, message, mode, timeoutMs = 30_000 } = params;

  return await new Promise<string>((resolve, reject) => {
    let reqCounter = 0;
    let runId: string | null = null;
    let finished = false;
    let responseText = "";
    let handshakeDone = false;

    const fail = (err: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      reject(new Error(err));
    };

    const done = (text: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      resolve(text);
    };

    const timer = setTimeout(() => {
      fail("Managed bridge timeout");
    }, timeoutMs);

    const nextReqId = () => `req_${++reqCounter}`;
    const ws = new WebSocket(config.gateway_url);

    ws.onopen = () => {
      // Wait for connect.challenge event before auth request.
    };

    ws.onmessage = (event) => {
      const msg = parseJsonSafe(typeof event.data === "string" ? event.data : String(event.data));
      if (!msg) return;

      if (msg.type === "event" && msg.event === "connect.challenge") {
        ws.send(JSON.stringify({
          type: "req",
          id: nextReqId(),
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "agentnumber-managed-bridge",
              displayName: "agentnumber-managed-bridge",
              version: "1.0.0",
              platform: "node",
              mode: "backend",
            },
            auth: { token: config.gateway_token },
            role: "operator",
            scopes: ["operator.read", "operator.write"],
          },
        }));
        return;
      }

      if (msg.type === "res" && (msg.payload as { type?: unknown })?.type === "hello-ok") {
        handshakeDone = true;
        ws.send(JSON.stringify({
          type: "req",
          id: nextReqId(),
          method: "agent",
          params: {
            agentId: config.agent_id || "main",
            sessionKey,
            message,
            idempotencyKey: randomUUID(),
            thinking: "off",
            extraSystemPrompt: getRules(mode, config),
          },
        }));
        return;
      }

      if (msg.type === "res" && (msg.ok === false)) {
        fail(((msg.error as { message?: string })?.message) || "OpenClaw request failed");
        return;
      }

      if (msg.type === "res" && msg.ok === true && !runId) {
        const maybeRunId = (msg.payload as { runId?: unknown })?.runId;
        if (typeof maybeRunId === "string") runId = maybeRunId;
        return;
      }

      if (msg.type === "event" && msg.event === "chat") {
        const payload = msg.payload as { runId?: unknown; state?: unknown; message?: unknown; errorMessage?: unknown };
        if (!runId || payload.runId !== runId) return;

        if (payload.state === "delta") {
          const text = extractText(payload.message);
          if (text) {
            // Some gateways send cumulative deltas, others send token chunks.
            responseText = text.startsWith(responseText) ? text : `${responseText}${text}`;
          }
          return;
        }
        if (payload.state === "final") {
          const text = extractText(payload.message);
          done(text || responseText || "");
          return;
        }
        if (payload.state === "error" || payload.state === "aborted") {
          fail(typeof payload.errorMessage === "string" ? payload.errorMessage : "Agent run failed");
          return;
        }
      }
    };

    ws.onerror = () => {
      if (!handshakeDone) {
        fail("Unable to connect to OpenClaw gateway");
      }
    };

    ws.onclose = () => {
      if (!finished && runId === null) {
        fail("OpenClaw gateway closed before run started");
      }
    };
  });
}
