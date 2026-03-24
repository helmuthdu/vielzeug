/* -------------------- Duration helpers -------------------- */

/**
 * Convenience helpers for expressing TTL values as named durations.
 * @example
 * ```ts
 * db.put('sessions', session, ttl.minutes(30));
 * db.put('cache', data, ttl.hours(1));
 * ```
 */
export const ttl = {
  days: (n: number) => n * 86_400_000,
  hours: (n: number) => n * 3_600_000,
  minutes: (n: number) => n * 60_000,
  ms: (n: number) => n,
  seconds: (n: number) => n * 1000,
} as const;

/* -------------------- TTL Envelope (storage-layer only) -------------------- */

/** @internal */
export type Envelope<T> = { exp?: number; v: T };

/** @internal */
export function wrap<T>(value: T, ttl?: number): Envelope<T> {
  return ttl ? { exp: Date.now() + ttl, v: value } : { v: value };
}

/** @internal */
export function unwrap<T>(env: Envelope<T>): T | undefined {
  return env.exp !== undefined && Date.now() >= env.exp ? undefined : env.v;
}

/** @internal */
export function isEnvelope(value: unknown): value is Envelope<unknown> {
  return typeof value === 'object' && value !== null && 'v' in value;
}

/** @internal */
export function readEnvelope<T>(raw: unknown): T | undefined {
  if (!raw || !isEnvelope(raw)) return undefined;

  return unwrap(raw as Envelope<T>);
}
