import { createServer } from "http";
import { execFile } from "child_process";

const PORT = 3002;
const OPENCLAW_BIN = "/opt/homebrew/bin/openclaw";
const AGENT = "main";
const SESSION = "agent:main:main";

function sendToAgent(message) {
  return new Promise((resolve, reject) => {
    execFile(
      OPENCLAW_BIN,
      ["agent", "-m", message, "--agent", AGENT, "--session-id", SESSION],
      { timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error("OpenClaw error:", stderr || error.message);
          reject(error);
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", agent: AGENT }));
    return;
  }

  // Vapi sends POST to /chat/completions (OpenAI-compatible)
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

    // Extract the latest user message from the messages array
    const messages = parsed.messages || [];
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const userText = lastUserMsg?.content || "";

    if (!userText) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No user message found" }));
      return;
    }

    console.log(`[call] User: "${userText}"`);

    try {
      const agentResponse = await sendToAgent(userText);
      console.log(`[call] Agent: "${agentResponse}"`);

      if (parsed.stream) {
        // SSE streaming response (what Vapi expects)
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        // Send the response in chunks for more natural speech
        const words = agentResponse.split(" ");
        const chunkSize = 4;
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(" ");
          const payload = {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion.chunk",
            choices: [
              {
                index: 0,
                delta: { content: (i > 0 ? " " : "") + chunk },
                finish_reason: null,
              },
            ],
          };
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }

        // Send finish
        const finish = {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion.chunk",
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        };
        res.write(`data: ${JSON.stringify(finish)}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        // Non-streaming response
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: agentResponse },
                finish_reason: "stop",
              },
            ],
          })
        );
      }
    } catch (err) {
      console.error("[call] Error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Agent unavailable" }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Voice bridge running on http://localhost:${PORT}`);
  console.log(`Agent: ${AGENT} | Session: ${SESSION}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run: ngrok http ${PORT}`);
  console.log(`  2. Use the ngrok URL as webhook_url when provisioning a number`);
});
