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
  days: (n: number) => assertTtlMs(n, 'ttl.days') * 86_400_000,
  hours: (n: number) => assertTtlMs(n, 'ttl.hours') * 3_600_000,
  minutes: (n: number) => assertTtlMs(n, 'ttl.minutes') * 60_000,
  ms: (n: number) => assertTtlMs(n, 'ttl.ms'),
  seconds: (n: number) => assertTtlMs(n, 'ttl.seconds') * 1000,
} as const;

/* -------------------- Storage record helpers (storage-layer only) -------------------- */

/** @internal Envelope used by storage adapters. */
export type StoredRecord<T> = {
  expiresAt?: number;
  value: T;
};

function assertTtlMs(ttlMs: number, source: string): number {
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new Error(`deposit: ${source} expected a finite non-negative number, received ${String(ttlMs)}`);
  }

  return ttlMs;
}

/** @internal */
export function wrapStored<T>(value: T, ttlMs?: number): StoredRecord<T> {
  if (ttlMs === undefined) return { value };

  const safeTtlMs = assertTtlMs(ttlMs, 'wrapStored');

  return { expiresAt: Date.now() + safeTtlMs, value };
}

/** @internal */
export function unwrapStored<T>(raw: StoredRecord<T>): T | undefined {
  if (raw.expiresAt !== undefined && Date.now() >= raw.expiresAt) return undefined;

  return raw.value;
}
