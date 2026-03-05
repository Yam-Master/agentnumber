import { randomBytes, createHash } from "crypto";

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(16).toString("hex"); // 32 hex chars
  const key = `an_live_${raw}`;
  const prefix = key.slice(0, 12); // "an_live_XXXX"
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
