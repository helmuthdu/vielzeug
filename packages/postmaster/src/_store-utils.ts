import type { StoredJob } from './types.ts';

/**
 * Strips `undefined` optional keys so persisted records only carry defined fields.
 * Shared by the IndexedDB store and the in-memory test store.
 */
export function normalize(entry: StoredJob): StoredJob {
  const { failure, leaseExpiresAt, ownerId, ...rest } = entry;
  return {
    ...rest,
    ...(failure !== undefined ? { failure } : {}),
    ...(leaseExpiresAt !== undefined ? { leaseExpiresAt } : {}),
    ...(ownerId !== undefined ? { ownerId } : {}),
  };
}
