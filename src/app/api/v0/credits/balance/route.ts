import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess } from "@/lib/api/response";
import { checkBalance } from "@/lib/credits/operations";
import type { ApiContext } from "@/lib/auth/types";

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext) => {
  const balanceCents = await checkBalance(ctx.orgId);

  return apiSuccess({
    balance_cents: balanceCents,
    balance_dollars: (balanceCents / 100).toFixed(2),
  });
});
