import { x402ResourceServer, type RouteConfig } from "@x402/next";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { Network } from "@x402/next";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0x0000000000000000000000000000000000000000";

export const NETWORK: Network = "eip155:84532"; // Base Sepolia testnet

export const provisionRouteConfig: RouteConfig = {
  accepts: [
    {
      scheme: "exact",
      price: "$5",
      network: NETWORK,
      payTo: PAY_TO,
    },
  ],
  description: "Provision a phone number for your AI agent",
};

export const callRouteConfig: RouteConfig = {
  accepts: [
    {
      scheme: "exact",
      price: "$0.01",
      network: NETWORK,
      payTo: PAY_TO,
    },
  ],
  description: "Trigger an outbound call from your agent",
};

export const resourceServer = new x402ResourceServer().register(
  NETWORK,
  new ExactEvmScheme()
);
