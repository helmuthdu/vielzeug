import { VaultError } from './errors';

/** Duration helpers that produce finite, positive millisecond values. */
export const ttl = {
  days: (n: number) => assertPositiveFinite(n * 86_400_000, 'ttl.days'),
  hours: (n: number) => assertPositiveFinite(n * 3_600_000, 'ttl.hours'),
  minutes: (n: number) => assertPositiveFinite(n * 60_000, 'ttl.minutes'),
  ms: (n: number) => assertPositiveFinite(n, 'ttl.ms'),
  seconds: (n: number) => assertPositiveFinite(n * 1000, 'ttl.seconds'),
} as const;

/** Fixed storage envelope shared by every adapter, so data and indexes stay portable. */
export type StoredRecord<T> = { expiresAt?: number; value: T };

export function isExpired(expiresAt: number | undefined): boolean {
  return expiresAt !== undefined && Date.now() >= expiresAt;
}

/** Throws when `ttlMs` is not a finite, positive number. Returns it unchanged otherwise. */
export function assertPositiveFinite(ttlMs: number, source: string): number {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new VaultError(`${source} expected a finite positive number, received ${String(ttlMs)}`);
  }

  return ttlMs;
}

export function parseStored<T>(raw: unknown): StoredRecord<T> | undefined {
  if (typeof raw !== 'object' || raw === null || !('value' in raw)) return undefined;

  const record = raw as { expiresAt?: unknown; value: unknown };

  if (record.expiresAt !== undefined && (typeof record.expiresAt !== 'number' || !Number.isFinite(record.expiresAt))) {
    return undefined;
  }

  return record as StoredRecord<T>;
}
