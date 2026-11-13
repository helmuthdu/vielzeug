/**
 * Wire envelope serialized through the configured `serialize` function.
 * Delivery is best-effort over the reliable, ordered data channel: v2
 * envelopes carry no per-message id because the API offers no resend with
 * a stable id, so a dedupe layer had nothing real to deduplicate.
 */
export interface WireEnvelope {
  readonly p: unknown;
  readonly t: string;
  readonly ts: number;
  readonly v: 2;
}

/** Returns the envelope, or `null` when the value violates the wire shape (older `v: 1` frames are malformed). */
export function toEnvelope(value: unknown): WireEnvelope | null {
  if (typeof value !== 'object' || value === null) return null;
  const env = value as Record<string, unknown>;
  if (env.v !== 2 || typeof env.t !== 'string' || typeof env.ts !== 'number') return null;
  return value as WireEnvelope;
}
