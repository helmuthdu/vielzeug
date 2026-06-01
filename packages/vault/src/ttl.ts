import { VaultError } from './errors';

/* -------------------- TtlMs (owns here to avoid circular deps with types.ts) -------------------- */

declare const ttlMsBrand: unique symbol;
/** A duration in milliseconds, produced by the `ttl.*` helpers. Branded to prevent accidental raw numbers. */
export type TtlMs = number & { readonly [ttlMsBrand]: never };

/* -------------------- Codec -------------------- */

/**
 * Pluggable serialization contract. Implement to change how vault stores values at rest
 * (e.g. compressed JSON, msgpack, encrypted envelopes).
 *
 * The codec translates between the vault-internal TTL envelope `{ value, expiresAt? }` and
 * whatever format is actually written to the underlying storage backend.
 *
 * The default codec stores `{ value: T, expiresAt?: number }` verbatim — identical to the
 * previous behaviour.
 *
 * ```ts
 * const compactCodec: VaultCodec = {
 *   encode: (value, expiresAt) => expiresAt ? { v: value, e: expiresAt } : { v: value },
 *   decode: (raw) => {
 *     if (typeof raw !== 'object' || raw === null || !('v' in raw)) return undefined;
 *     const { v, e } = raw as { v: unknown; e?: unknown };
 *     return { value: v as any, expiresAt: typeof e === 'number' ? e : undefined };
 *   },
 * };
 * ```
 */
export type VaultCodec = {
  /**
   * Parse a raw stored value into the internal TTL envelope.
   * Return `undefined` for any unrecognized or corrupt data.
   */
  decode<T>(raw: unknown): { expiresAt?: number; value: T } | undefined;
  /**
   * Encode a value (and optional absolute expiry timestamp) into the storage format.
   * `expiresAt` is an epoch-ms timestamp — use `Date.now() + ttlMs` to compute it.
   */
  encode<T>(value: T, expiresAt?: number): unknown;
};

/* -------------------- Duration helpers -------------------- */

export const ttl = {
  days: (n: number) => assertTtlMs(assertTtlMs(n, 'ttl.days') * 86_400_000, 'ttl.days (result)'),
  hours: (n: number) => assertTtlMs(assertTtlMs(n, 'ttl.hours') * 3_600_000, 'ttl.hours (result)'),
  minutes: (n: number) => assertTtlMs(assertTtlMs(n, 'ttl.minutes') * 60_000, 'ttl.minutes (result)'),
  ms: (n: number) => assertTtlMs(n, 'ttl.ms'),
  seconds: (n: number) => assertTtlMs(assertTtlMs(n, 'ttl.seconds') * 1000, 'ttl.seconds (result)'),
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

/** Default codec — stores `{ value, expiresAt? }` verbatim. Zero overhead vs. previous behaviour. */
export const defaultCodec: VaultCodec = {
  decode: parseStored as VaultCodec['decode'],
  encode: <T>(value: T, expiresAt?: number): unknown => (expiresAt !== undefined ? { expiresAt, value } : { value }),
};
