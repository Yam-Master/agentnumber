/**
 * Convert a UUID to a public-facing prefixed ID.
 * e.g. toPublicId('num', '550e8400-e29b-41d4-a716-446655440000') → 'num_550e8400e29b41d4a716446655440000'
 */
export function toPublicId(prefix: string, uuid: string): string {
  return `${prefix}_${uuid.replace(/-/g, "")}`;
}

/**
 * Convert a public-facing prefixed ID back to a UUID.
 * e.g. fromPublicId('num_550e8400e29b41d4a716446655440000') → '550e8400-e29b-41d4-a716-446655440000'
 */
export function fromPublicId(id: string): string {
  const hex = id.split("_").slice(1).join("_");
  if (hex.length !== 32) {
    throw new Error(`Invalid public ID: ${id}`);
  }
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
