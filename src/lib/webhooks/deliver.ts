import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export async function deliverWebhooks(
  orgId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();

  // Find all active webhooks for this org that subscribe to this event
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("org_id", orgId)
    .eq("active", true)
    .contains("events", [event]);

  if (!webhooks || webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  // Deliver to all matching webhooks (fire and forget)
  await Promise.allSettled(
    webhooks.map(async (webhook) => {
      const signature = createHmac("sha256", webhook.secret)
        .update(body)
        .digest("hex");

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AgentNumber-Signature": signature,
            "X-AgentNumber-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
          console.error(
            `Webhook delivery failed: ${webhook.url} returned ${response.status}`
          );
        }
      } catch (err) {
        console.error(`Webhook delivery error: ${webhook.url}`, err);
      }
    })
  );
}
