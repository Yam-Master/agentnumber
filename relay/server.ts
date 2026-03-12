import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createHash } from "crypto";

// ─── Types ───

interface TunnelEntry {
  ws: WebSocket;
  pendingRequests: Map<string, ServerResponse>;
}

// ─── State ───

const tunnels = new Map<string, TunnelEntry>(); // SHA256(token) → tunnel
let requestCounter = 0;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function nextRequestId(): string {
  return `req_${Date.now()}_${++requestCounter}`;
}

// ─── HTTP Server ───

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", tunnels: tunnels.size }));
    return;
  }

  if (req.method === "POST" && req.url === "/v1/request") {
    handleRequest(req, res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  // Auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing authorization" }));
    return;
  }

  const token = authHeader.slice(7);
  const hash = hashToken(token);
  const tunnel = tunnels.get(hash);

  if (!tunnel || tunnel.ws.readyState !== WebSocket.OPEN) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Tunnel not connected" }));
    return;
  }

  // Parse body
  let body: string;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body" }));
    return;
  }

  let parsed: {
    agentId: string;
    sessionKey: string;
    message: string;
    extraSystemPrompt?: string;
    timeout?: number;
  };
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }

  if (!parsed.agentId || !parsed.sessionKey || !parsed.message) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing required fields: agentId, sessionKey, message" }));
    return;
  }

  // Set up SSE response
  const requestId = nextRequestId();
  const timeoutMs = parsed.timeout || 55000;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Store pending request
  tunnel.pendingRequests.set(requestId, res);

  // Timeout
  const timer = setTimeout(() => {
    if (tunnel.pendingRequests.has(requestId)) {
      tunnel.pendingRequests.delete(requestId);
      res.write(`data: ${JSON.stringify({ type: "error", message: "Request timeout" })}\n\n`);
      res.end();
    }
  }, timeoutMs);

  // Clean up on client disconnect
  res.on("close", () => {
    clearTimeout(timer);
    tunnel.pendingRequests.delete(requestId);
  });

  // Forward request to tunnel
  tunnel.ws.send(JSON.stringify({
    type: "request",
    id: requestId,
    agentId: parsed.agentId,
    sessionKey: parsed.sessionKey,
    message: parsed.message,
    extraSystemPrompt: parsed.extraSystemPrompt,
  }));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

// ─── WebSocket Server (Tunnel) ───

const wss = new WebSocketServer({ server, path: "/tunnel" });

wss.on("connection", (ws) => {
  let tokenHash: string | null = null;
  let authenticated = false;

  // Auth timeout — must authenticate within 10s
  const authTimer = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, "Auth timeout");
    }
  }, 10000);

  // Heartbeat — use both WS-level and app-level pings
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let alive = true;

  function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
      if (!alive) {
        ws.close(4002, "Heartbeat timeout");
        return;
      }
      alive = false;
      // WS protocol-level ping (keeps proxies/load balancers happy)
      ws.ping();
      // App-level ping (tunnel client responds with app-level pong)
      ws.send(JSON.stringify({ type: "ping" }));
    }, 20000); // every 20s instead of 30s
  }

  // WS protocol-level pong resets alive flag
  ws.on("pong", () => {
    alive = true;
  });

  ws.on("message", (data) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    // Auth
    if (!authenticated) {
      if (msg.type === "auth" && typeof msg.token === "string") {
        tokenHash = hashToken(msg.token);

        // Close existing tunnel for same token (reconnect scenario)
        const existing = tunnels.get(tokenHash);
        if (existing) {
          existing.ws.close(4003, "Replaced by new connection");
        }

        tunnels.set(tokenHash, { ws, pendingRequests: new Map() });
        authenticated = true;
        clearTimeout(authTimer);
        ws.send(JSON.stringify({ type: "auth_ok" }));
        startHeartbeat();
        console.log(`Tunnel connected: ${tokenHash.slice(0, 12)}... (${tunnels.size} active)`);
      } else {
        ws.close(4001, "Expected auth message");
      }
      return;
    }

    // App-level pong
    if (msg.type === "pong") {
      alive = true;
      return;
    }

    // Response forwarding (delta/final/error)
    if (
      (msg.type === "delta" || msg.type === "final" || msg.type === "error") &&
      typeof msg.id === "string"
    ) {
      const entry = tunnels.get(tokenHash!);
      if (!entry) return;

      const res = entry.pendingRequests.get(msg.id);
      if (!res) return;

      res.write(`data: ${JSON.stringify(msg)}\n\n`);

      if (msg.type === "final" || msg.type === "error") {
        entry.pendingRequests.delete(msg.id);
        res.end();
      }
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (tokenHash) {
      const entry = tunnels.get(tokenHash);
      if (entry?.ws === ws) {
        // Close all pending requests
        for (const [, res] of entry.pendingRequests) {
          res.write(`data: ${JSON.stringify({ type: "error", message: "Tunnel disconnected" })}\n\n`);
          res.end();
        }
        tunnels.delete(tokenHash);
        console.log(`Tunnel disconnected: ${tokenHash.slice(0, 12)}... (${tunnels.size} active)`);
      }
    }
  });

  ws.on("error", (err) => {
    console.error("Tunnel WS error:", err.message);
  });
});

// ─── Start ───

const PORT = parseInt(process.env.PORT || "8080", 10);
server.listen(PORT, () => {
  console.log(`Relay server listening on port ${PORT}`);
});
