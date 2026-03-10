import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { openClawRequest } from "@/lib/openclaw";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ numberId: string }> }
) {
  const { numberId } = await params;
  const supabase = createServiceClient();

  const { data: number } = await supabase
    .from("numbers")
    .select("system_prompt, status, voice_mode, gateway_url, gateway_token_encrypted, gateway_agent_id, gateway_session_key")
    .eq("id", numberId)
    .single();

  if (!number || number.status !== "active") {
    return new Response(JSON.stringify({ error: "Number not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const messages: { role: string; content: string }[] = body.messages || [];

  if (number.voice_mode === "gateway") {
    return handleGateway(number, messages, body.stream);
  }

  // Default: anthropic mode
  return handleAnthropic(number, messages, body.stream);
}

// ─── SSE Helpers ───

function sseChunk(
  chatId: string,
  created: number,
  delta: Record<string, unknown>,
  finishReason: string | null = null
) {
  return `data: ${JSON.stringify({
    id: chatId,
    object: "chat.completion.chunk",
    created,
    model: "custom",
    choices: [{ index: 0, delta, logprobs: null, finish_reason: finishReason }],
  })}\n\n`;
}

// ─── Gateway Mode ───

function handleGateway(
  number: Record<string, unknown>,
  messages: { role: string; content: string }[],
  stream: boolean
) {
  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const userText = lastUserMsg?.content || "Hello";

  let gatewayToken: string;
  try {
    gatewayToken = decrypt(number.gateway_token_encrypted as string);
  } catch {
    return new Response(JSON.stringify({ error: "Gateway configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const config = {
    gatewayUrl: number.gateway_url as string,
    gatewayToken,
    agentId: number.gateway_agent_id as string,
    sessionKey: (number.gateway_session_key as string) || `agent:${number.gateway_agent_id}:phone`,
  };

  const encoder = new TextEncoder();

  if (stream) {
    const chatId = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);
    let sentLength = 0;

    const readable = new ReadableStream({
      start(controller) {
        // Initial role chunk (OpenAI spec)
        controller.enqueue(encoder.encode(sseChunk(chatId, created, { role: "assistant" })));

        openClawRequest(
          config,
          { message: userText },
          {
            onDelta(cumulativeText) {
              const newPart = cumulativeText.slice(sentLength);
              if (newPart) {
                sentLength = cumulativeText.length;
                controller.enqueue(encoder.encode(sseChunk(chatId, created, { content: newPart })));
              }
            },
            onFinal(text) {
              if (text) {
                const remaining = text.slice(sentLength);
                if (remaining) {
                  controller.enqueue(encoder.encode(sseChunk(chatId, created, { content: remaining })));
                }
              }
              controller.enqueue(encoder.encode(sseChunk(chatId, created, {}, "stop")));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
            onError() {
              controller.enqueue(encoder.encode(
                sseChunk(chatId, created, { content: "Sorry, I'm having trouble right now." })
              ));
              controller.enqueue(encoder.encode(sseChunk(chatId, created, {}, "stop")));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          },
          55000
        );
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } else {
    // Non-streaming gateway
    return (async () => {
      let fullText = "";
      await openClawRequest(
        config,
        { message: userText },
        {
          onDelta(text) { fullText = text; },
          onFinal(text) { if (text) fullText = text; },
          onError() { fullText = fullText || "Sorry, I'm having trouble right now."; },
        },
        55000
      );
      return new Response(
        JSON.stringify({
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "custom",
          choices: [{ index: 0, message: { role: "assistant", content: fullText }, logprobs: null, finish_reason: "stop" }],
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    })();
  }
}

// ─── Anthropic Mode ───

async function handleAnthropic(
  number: Record<string, unknown>,
  messages: { role: string; content: string }[],
  stream: boolean
) {
  const systemPrompt = (number.system_prompt as string) || "You are a helpful phone assistant. Keep responses concise and conversational.";
  const anthropicMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  if (anthropicMessages.length === 0 || anthropicMessages[0].role !== "user") {
    anthropicMessages.unshift({ role: "user", content: "Hello" });
  }

  if (stream) {
    const anthropicStream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const encoder = new TextEncoder();
    const chatId = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Initial role chunk (OpenAI spec)
          controller.enqueue(encoder.encode(sseChunk(chatId, created, { role: "assistant" })));

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(sseChunk(chatId, created, { content: event.delta.text }))
              );
            }
          }

          controller.enqueue(encoder.encode(sseChunk(chatId, created, {}, "stop")));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Voice stream error:", err);
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } else {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return new Response(
      JSON.stringify({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "custom",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: text },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
