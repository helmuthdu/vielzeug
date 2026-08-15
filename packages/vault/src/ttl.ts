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

export function parseStored<T>(raw: unknown): StoredRecord<T> | undefined {
  if (typeof raw !== 'object' || raw === null || !('value' in raw)) return undefined;

  const record = raw as { expiresAt?: unknown; value: unknown };

  if (record.expiresAt !== undefined && (typeof record.expiresAt !== 'number' || !Number.isFinite(record.expiresAt))) {
    return undefined;
  }

  return record as StoredRecord<T>;
}
