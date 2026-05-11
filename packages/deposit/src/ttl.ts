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

/* -------------------- Storage record helpers (storage-layer only) -------------------- */

/** @internal Envelope used by storage adapters. */
export type StoredRecord<T> = {
  e?: number;
  v: T;
};

/** @internal */
export function wrapStored<T>(value: T, ttlMs?: number): StoredRecord<T> {
  if (ttlMs === undefined) return { v: value };

  return { e: Date.now() + ttlMs, v: value };
}

/** @internal */
export function unwrapStored<T>(raw: StoredRecord<T>): T | undefined {
  if (raw.e !== undefined && Date.now() >= raw.e) return undefined;

  return raw.v;
}
