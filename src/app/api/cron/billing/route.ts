import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkBalance, debitCredits } from "@/lib/credits/operations";
import { releaseNumberByPhone } from "@/lib/twilio";
import { NUMBER_MONTHLY_CENTS } from "@/lib/billing";

// Vercel cron auth
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const auth = request.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const today = now.getUTCDate();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowDay = tomorrow.getUTCDate();

  // Get all active numbers
  const { data: numbers, error } = await supabase
    .from("numbers")
    .select("id, org_id, phone_number, created_at, vapi_phone_number_id, vapi_assistant_id")
    .eq("status", "active");

  if (error || !numbers) {
    console.error("Billing cron: failed to fetch numbers", error);
    return NextResponse.json({ error: "Failed to fetch numbers" }, { status: 500 });
  }

  let charged = 0;
  let cancelled = 0;

  for (const num of numbers) {
    const createdDay = new Date(num.created_at).getUTCDate();

    // Check if tomorrow is the billing day — cancel if org can't afford it
    if (createdDay === tomorrowDay) {
      const balance = await checkBalance(num.org_id);
      if (balance < NUMBER_MONTHLY_CENTS) {
        await cancelNumber(supabase, num);
        cancelled++;
        console.log(`Billing: cancelled ${num.phone_number} (org ${num.org_id}, balance ${balance}¢ < ${NUMBER_MONTHLY_CENTS}¢)`);
      }
    }

    // Bill on the anniversary day
    if (createdDay === today) {
      // Skip if number was created today (first month is free from provisioning)
      const createdDate = new Date(num.created_at);
      const diffMs = now.getTime() - createdDate.getTime();
      if (diffMs < 24 * 60 * 60 * 1000) continue;

      const success = await debitCredits(
        num.org_id,
        NUMBER_MONTHLY_CENTS,
        `Monthly number charge: ${num.phone_number}`,
        num.id,
        "number_monthly"
      );

      if (success) {
        charged++;
        console.log(`Billing: charged ${NUMBER_MONTHLY_CENTS}¢ for ${num.phone_number} (org ${num.org_id})`);
      } else {
        // Insufficient funds on billing day — cancel immediately
        await cancelNumber(supabase, num);
        cancelled++;
        console.log(`Billing: cancelled ${num.phone_number} on billing day (insufficient funds)`);
      }
    }
  }

  return NextResponse.json({ processed: numbers.length, charged, cancelled });
}

async function cancelNumber(
  supabase: ReturnType<typeof createServiceClient>,
  num: { id: string; phone_number: string; vapi_phone_number_id: string; vapi_assistant_id: string }
) {
  // Clean up Vapi resources
  try {
    const { vapi } = await import("@/lib/vapi");
    if (num.vapi_phone_number_id && num.vapi_phone_number_id !== "pending") {
      await vapi.phoneNumbers.delete({ id: num.vapi_phone_number_id }).catch(() => {});
    }
    if (num.vapi_assistant_id && num.vapi_assistant_id !== "pending") {
      await vapi.assistants.delete({ id: num.vapi_assistant_id }).catch(() => {});
    }
  } catch (err) {
    console.error(`Failed to clean up Vapi resources for ${num.phone_number}:`, err);
  }

  // Release from Twilio
  try {
    await releaseNumberByPhone(num.phone_number);
  } catch (err) {
    console.error(`Failed to release ${num.phone_number} from Twilio:`, err);
  }

  // Mark as released in DB
  await supabase
    .from("numbers")
    .update({ status: "released" })
    .eq("id", num.id);
}
