import { VaultError } from './errors';

/* -------------------- TtlMs (owns here to avoid circular deps with types.ts) -------------------- */

declare const ttlMsBrand: unique symbol;
/** A duration in milliseconds, produced by the `ttl.*` helpers. Branded to prevent accidental raw numbers. */
export type TtlMs = number & { readonly [ttlMsBrand]: never };

/* -------------------- Duration helpers -------------------- */

export const ttl = {
  days: (n: number) => (assertTtlMs(n, 'ttl.days') * 86_400_000) as TtlMs,
  hours: (n: number) => (assertTtlMs(n, 'ttl.hours') * 3_600_000) as TtlMs,
  minutes: (n: number) => (assertTtlMs(n, 'ttl.minutes') * 60_000) as TtlMs,
  ms: (n: number) => assertTtlMs(n, 'ttl.ms'),
  seconds: (n: number) => (assertTtlMs(n, 'ttl.seconds') * 1000) as TtlMs,
} as const;

/* -------------------- Storage record -------------------- */

/** Internal envelope used by all storage backends. `expiresAt` is an epoch timestamp in ms. */
export type StoredRecord<T> = {
  expiresAt?: number;
  value: T;
};

export function assertTtlMs(ttlMs: number, source: string): TtlMs {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new VaultError(`${source} expected a finite positive number, received ${String(ttlMs)}`);
  }

  return ttlMs as TtlMs;
}

export function wrapStored<T>(value: T, ttlMs?: TtlMs): StoredRecord<T> {
  if (ttlMs === undefined) return { value };

  return { expiresAt: Date.now() + ttlMs, value };
}

export function unwrapStored<T>(raw: StoredRecord<T>): T | undefined {
  if (raw.expiresAt !== undefined && Date.now() >= raw.expiresAt) return undefined;

  return raw.value;
}

export function parseStored<T>(raw: unknown): StoredRecord<T> | undefined {
  if (typeof raw !== 'object' || raw === null || !('value' in raw)) return undefined;

  const record = raw as { expiresAt?: unknown; value: unknown };

  if (record.expiresAt !== undefined && (typeof record.expiresAt !== 'number' || !Number.isFinite(record.expiresAt))) {
    return undefined;
  }

  return record as StoredRecord<T>;
}

/**
 * Parse a raw stored value and determine its TTL status in one call.
 * Combines `parseStored` + `unwrapStored` with an explicit `expired` flag so callers
 * can distinguish between "key not found" (`found: false`) and "key is TTL-expired"
 * (`found: true, expired: true, value: undefined`).
 */
export function readWithTtl<T>(raw: unknown): { expired: boolean; found: boolean; value: T | undefined } {
  const parsed = parseStored<T>(raw);

  if (!parsed) return { expired: false, found: false, value: undefined };

  const value = unwrapStored(parsed);

  return { expired: value === undefined, found: true, value };
}
