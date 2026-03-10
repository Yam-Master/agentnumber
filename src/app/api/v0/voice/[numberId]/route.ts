import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { runManagedBridge } from "@/lib/openclaw-bridge";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ numberId: string }> }
) {
  const { numberId } = await params;
  const supabase = createServiceClient();

  // Look up the number to get the system prompt
  const { data: number } = await supabase
    .from("numbers")
    .select("id, org_id, system_prompt, status, inbound_mode")
    .eq("id", numberId)
    .single();

  if (!number || number.status !== "active") {
    return new Response(JSON.stringify({ error: "Number not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse Vapi's OpenAI-compatible request
  const body = await request.json();
  const messages: { role: string; content: string }[] = body.messages || [];

  if (number.inbound_mode === "managed_bridge") {
    const { data: bridge } = await supabase
      .from("managed_bridge_connections")
      .select("gateway_url, gateway_token, agent_id, enabled, voice_rules, sms_rules")
      .eq("org_id", number.org_id)
      .single();

    if (!bridge || bridge.enabled !== true) {
      return new Response(JSON.stringify({ error: "Managed bridge not configured or disabled" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userText = [...messages]
      .reverse()
      .find((m) => m.role === "user" && typeof m.content === "string" && m.content.trim())?.content
      || "Hello";

    try {
      const text = await runManagedBridge({
        config: {
          gateway_url: bridge.gateway_url as string,
          gateway_token: bridge.gateway_token as string,
          agent_id: (bridge.agent_id as string) || "main",
          voice_rules: (bridge.voice_rules as string | null) ?? null,
          sms_rules: (bridge.sms_rules as string | null) ?? null,
        },
        sessionKey: `agent:${(bridge.agent_id as string) || "main"}:phone:${number.id}`,
        message: userText,
        mode: "voice",
      });

      if (body.stream) {
        const chatId = `chatcmpl-${Date.now()}`;
        const created = Math.floor(Date.now() / 1000);
        const sse = [
          `data: ${JSON.stringify({ id: chatId, object: "chat.completion.chunk", created, model: "custom", choices: [{ index: 0, delta: { role: "assistant" }, logprobs: null, finish_reason: null }] })}`,
          "",
          `data: ${JSON.stringify({ id: chatId, object: "chat.completion.chunk", created, model: "custom", choices: [{ index: 0, delta: { content: text }, logprobs: null, finish_reason: null }] })}`,
          "",
          `data: ${JSON.stringify({ id: chatId, object: "chat.completion.chunk", created, model: "custom", choices: [{ index: 0, delta: {}, logprobs: null, finish_reason: "stop" }] })}`,
          "",
          "data: [DONE]",
          "",
        ].join("\n");

        return new Response(sse, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      }

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Managed bridge failed";
      return new Response(JSON.stringify({ error: message }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Convert to Anthropic format
  const systemPrompt = number.system_prompt || "You are a helpful phone assistant. Keep responses concise and conversational.";
  const anthropicMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Ensure messages alternate and start with user
  if (anthropicMessages.length === 0 || anthropicMessages[0].role !== "user") {
    anthropicMessages.unshift({ role: "user", content: "Hello" });
  }

  if (body.stream) {
    // SSE streaming response
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const encoder = new TextEncoder();
    const chatId = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    function sseChunk(delta: Record<string, unknown>, finishReason: string | null = null) {
      return `data: ${JSON.stringify({
        id: chatId,
        object: "chat.completion.chunk",
        created,
        model: "custom",
        choices: [{ index: 0, delta, logprobs: null, finish_reason: finishReason }],
      })}\n\n`;
    }

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Initial role chunk (OpenAI spec)
          controller.enqueue(encoder.encode(sseChunk({ role: "assistant" })));

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(sseChunk({ content: event.delta.text }))
              );
            }
          }

          controller.enqueue(encoder.encode(sseChunk({}, "stop")));
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
    // Non-streaming
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
