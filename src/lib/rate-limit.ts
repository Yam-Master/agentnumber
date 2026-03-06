const hits = new Map<string, number[]>();

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = hits.get(key) || [];
  const windowStart = now - windowMs;
  const recent = timestamps.filter((t) => t > windowStart);
  if (recent.length >= maxRequests) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}
