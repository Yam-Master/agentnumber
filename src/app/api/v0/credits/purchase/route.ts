import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { resourceServer, PAY_TO, NETWORK } from "@/lib/x402/config";
import { authenticateApiKey } from "@/lib/auth/middleware";
import { depositCredits } from "@/lib/credits/operations";

// $10 pack = 1000 credits ($10.00)
const CREDIT_PACK_CENTS = 1000;
const PRICE_USDC = "$10.00";

const handler = async (request: NextRequest): Promise<NextResponse> => {
  // Auth: verify API key to know which org to credit
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: { message: "Invalid API key", code: "unauthorized" } },
      { status: 401 }
    );
  }

  // If we get here, payment was verified by x402 middleware
  const newBalance = await depositCredits(
    auth.orgId,
    CREDIT_PACK_CENTS,
    `x402 USDC purchase: ${PRICE_USDC}`
  );

  return NextResponse.json({
    success: true,
    data: {
      deposited_cents: CREDIT_PACK_CENTS,
      balance_cents: newBalance,
      balance_dollars: (newBalance / 100).toFixed(2),
    },
  });
};

export const POST = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        price: PRICE_USDC,
        network: NETWORK,
        payTo: PAY_TO,
      },
    ],
    description: "Purchase 1000 credits ($10.00) for AgentNumber",
    mimeType: "application/json",
  },
  resourceServer,
);
