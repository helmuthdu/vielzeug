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

/** @internal Flat record with an optional expiry timestamp merged at the top level. */
export type StoredRecord<T extends Record<string, unknown>> = T & { __exp?: number };

/** @internal */
export function wrapStored<T extends Record<string, unknown>>(value: T, ttlMs?: number): StoredRecord<T> {
  return ttlMs ? { ...value, __exp: Date.now() + ttlMs } : ({ ...value } as StoredRecord<T>);
}

/** @internal */
export function unwrapStored<T extends Record<string, unknown>>(raw: StoredRecord<T>): T | undefined {
  if (raw.__exp !== undefined && Date.now() >= raw.__exp) return undefined;

  const { __exp: _, ...value } = raw;

  return value as T;
}
