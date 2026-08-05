import { VaultError } from './errors';

declare const ttlMsBrand: unique symbol;
/** A duration in milliseconds, produced by the `ttl.*` helpers. */
export type TtlMs = number & { readonly [ttlMsBrand]: never };

export const ttl = {
  days: (n: number) => assertTtlMs(assertTtlMs(n, 'ttl.days') * 86_400_000, 'ttl.days (result)'),
  hours: (n: number) => assertTtlMs(assertTtlMs(n, 'ttl.hours') * 3_600_000, 'ttl.hours (result)'),
  minutes: (n: number) => assertTtlMs(assertTtlMs(n, 'ttl.minutes') * 60_000, 'ttl.minutes (result)'),
  ms: (n: number) => assertTtlMs(n, 'ttl.ms'),
  seconds: (n: number) => assertTtlMs(assertTtlMs(n, 'ttl.seconds') * 1000, 'ttl.seconds (result)'),
} as const;

/** Fixed storage envelope shared by every adapter, so data and indexes stay portable. */
export type StoredRecord<T> = { expiresAt?: number; value: T };

export function isExpired(expiresAt: number | undefined): boolean {
  return expiresAt !== undefined && Date.now() >= expiresAt;
}

export function assertTtlMs(ttlMs: number, source: string): TtlMs {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new VaultError(`${source} expected a finite positive number, received ${String(ttlMs)}`);
  }

  return ttlMs as TtlMs;
}

export function wrapStored<T>(value: T, ttlMs?: TtlMs): StoredRecord<T> {
  return ttlMs === undefined ? { value } : { expiresAt: Date.now() + ttlMs, value };
}

export function unwrapStored<T>(raw: StoredRecord<T>): T | undefined {
  return isExpired(raw.expiresAt) ? undefined : raw.value;
}

export function parseStored<T>(raw: unknown): StoredRecord<T> | undefined {
  if (typeof raw !== 'object' || raw === null || !('value' in raw)) return undefined;

  const record = raw as { expiresAt?: unknown; value: unknown };

  if (record.expiresAt !== undefined && (typeof record.expiresAt !== 'number' || !Number.isFinite(record.expiresAt))) {
    return undefined;
  }

  return record as StoredRecord<T>;
}

export function readWithTtl<T>(raw: unknown): { expired: boolean; found: boolean; value: T | undefined } {
  const parsed = parseStored<T>(raw);

  if (!parsed) return { expired: false, found: false, value: undefined };

  const value = unwrapStored(parsed);

  return { expired: value === undefined, found: true, value };
}
