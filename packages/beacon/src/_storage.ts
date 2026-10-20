import type { BeaconProgress, BeaconStatus, BeaconStorage } from './types';

/** Prefix keeps beacon records from colliding with an app's other storage keys. */
const KEY_PREFIX = '@vielzeug/beacon:';

export const storageKey = (id: string): string => `${KEY_PREFIX}${id}`;

const STATUSES = new Set<BeaconStatus>(['active', 'completed', 'dismissed', 'idle', 'paused']);

/**
 * Validates a record read back from storage. Persisted values cross a trust
 * boundary: a stale, hand-edited, or foreign record must not crash a tour.
 */
export function parseProgress(value: unknown): BeaconProgress | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.version !== 'number' || !Number.isFinite(record.version)) return null;
  if (typeof record.stepIndex !== 'number' || !Number.isInteger(record.stepIndex) || record.stepIndex < -1) return null;
  if (!STATUSES.has(record.status as BeaconStatus)) return null;

  return { status: record.status as BeaconStatus, stepIndex: record.stepIndex, version: record.version };
}

/** Progress kept for the lifetime of one handle; the fallback when no storage is configured. */
export function createMemoryStorage(): BeaconStorage {
  const entries = new Map<string, BeaconProgress>();

  return {
    get: (key) => entries.get(key),
    remove: (key) => {
      entries.delete(key);
    },
    set: (key, value) => {
      entries.set(key, value);
    },
  };
}
