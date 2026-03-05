import { createServiceClient } from "@/lib/supabase/server";

export async function checkBalance(orgId: string): Promise<number> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("credits_balance")
    .select("balance_cents")
    .eq("org_id", orgId)
    .single();

  return data?.balance_cents ?? 0;
}

export async function depositCredits(
  orgId: string,
  amountCents: number,
  description: string
): Promise<number> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("deposit_credits", {
    p_org_id: orgId,
    p_amount_cents: amountCents,
    p_description: description,
  });

  if (error) throw new Error(`Failed to deposit credits: ${error.message}`);
  return data as number;
}

export async function debitCredits(
  orgId: string,
  amountCents: number,
  description: string,
  refId?: string,
  refType?: string
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("debit_credits", {
    p_org_id: orgId,
    p_amount_cents: amountCents,
    p_description: description,
    p_ref_id: refId ?? null,
    p_ref_type: refType ?? null,
  });

  if (error) throw new Error(`Failed to debit credits: ${error.message}`);
  return data as boolean;
}
