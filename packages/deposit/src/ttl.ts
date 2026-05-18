import type { TtlMs } from './types';

/* -------------------- Duration helpers -------------------- */

/**
 * Convenience helpers for expressing TTL (time-to-live) values as named durations.
 *
 * Use with storage operations to set expiration times for records.
 * Supports days, hours, minutes, seconds, and milliseconds.
 *
 * @example
 * ```ts
 * db.put('sessions', session, ttl.minutes(30));
 * db.put('cache', data, ttl.hours(1));
 * db.put('temp', tempData, ttl.days(7));
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
  e?: number;
  v: T;
};

function assertTtlMs(ttlMs: number, source: string): TtlMs {
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new Error(`deposit: ${source} expected a finite non-negative number, received ${String(ttlMs)}`);
  }

  return ttlMs as TtlMs;
}

/** @internal */
export function wrapStored<T>(value: T, ttlMs?: TtlMs): StoredRecord<T> {
  if (ttlMs === undefined) return { v: value };

  const safeTtlMs = assertTtlMs(ttlMs, 'ttl');

  return { e: Date.now() + safeTtlMs, v: value };
}

/** @internal */
export function unwrapStored<T>(raw: StoredRecord<T>): T | undefined {
  if (raw.e !== undefined && Date.now() >= raw.e) return undefined;

  return raw.v;
}

/** @internal */
export function parseStored<T>(raw: unknown): StoredRecord<T> | undefined {
  if (typeof raw !== 'object' || raw === null || !('v' in raw)) return undefined;

  const record = raw as { e?: unknown; v: unknown };

  if (record.e !== undefined && (typeof record.e !== 'number' || !Number.isFinite(record.e))) return undefined;

  return record as StoredRecord<T>;
}
