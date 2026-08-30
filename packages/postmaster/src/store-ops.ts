import { PostmasterJobError } from './errors.ts';
import type { PostmasterEntry, RemoveResult, RetryResult, StoredFailure, StoredJob, StoreTx } from './types.ts';

export interface ClaimParams {
  readonly leaseDuration: number;
  readonly now: number;
  readonly ownerId: string;
}

export interface OwnedParams {
  readonly id: string;
  readonly now: number;
  readonly ownerId: string;
}

export interface RescheduleParams extends OwnedParams {
  readonly availableAt: number;
  readonly failure: StoredFailure;
}

export interface DeadLetterParams extends OwnedParams {
  readonly failure: StoredFailure;
}

/** Claim the earliest eligible job atomically. Returns the claimed entry or undefined. */
export async function claimJob(tx: StoreTx, params: ClaimParams): Promise<StoredJob | undefined> {
  const entry = await tx.findClaimable(params.now);
  if (!entry) return undefined;
  const claimed: StoredJob = {
    ...entry,
    attempts: entry.attempts + 1,
    failure: undefined,
    leaseExpiresAt: params.now + params.leaseDuration,
    ownerId: params.ownerId,
    status: 'running',
    updatedAt: params.now,
  };
  await tx.put(claimed);
  return claimed;
}

/** Complete and delete a job. Returns false if the owner is stale or the job is gone. */
export async function completeJob(tx: StoreTx, params: OwnedParams): Promise<boolean> {
  const entry = await tx.get(params.id);
  if (!entry || entry.status !== 'running' || entry.ownerId !== params.ownerId) return false;
  await tx.delete(params.id);
  return true;
}

/** Release a claimed job back to queued without consuming an attempt. Returns false if stale. */
export async function releaseJob(tx: StoreTx, params: OwnedParams): Promise<boolean> {
  const entry = await tx.get(params.id);
  if (!entry || entry.status !== 'running' || entry.ownerId !== params.ownerId) return false;
  await tx.put({
    ...entry,
    leaseExpiresAt: undefined,
    ownerId: undefined,
    status: 'queued',
    updatedAt: params.now,
  });
  return true;
}

/** Reschedule a running job back to queued with a future availableAt. Returns false if stale. */
export async function rescheduleJob(tx: StoreTx, params: RescheduleParams): Promise<boolean> {
  const entry = await tx.get(params.id);
  if (!entry || entry.status !== 'running' || entry.ownerId !== params.ownerId) return false;
  await tx.put({
    ...entry,
    availableAt: params.availableAt,
    failure: params.failure,
    leaseExpiresAt: undefined,
    ownerId: undefined,
    status: 'queued',
    updatedAt: params.now,
  });
  return true;
}

/** Move a running job to dead-letter. Returns false if stale. */
export async function deadLetterJob(tx: StoreTx, params: DeadLetterParams): Promise<boolean> {
  const entry = await tx.get(params.id);
  if (!entry || entry.status !== 'running' || entry.ownerId !== params.ownerId) return false;
  await tx.put({
    ...entry,
    failure: params.failure,
    leaseExpiresAt: undefined,
    ownerId: undefined,
    status: 'dead-letter',
    updatedAt: params.now,
  });
  return true;
}

/** Renew a lease for the current owner. Returns false if stale. */
export async function renewLeaseJob(tx: StoreTx, params: OwnedParams & { leaseExpiresAt: number }): Promise<boolean> {
  const entry = await tx.get(params.id);
  if (!entry || entry.status !== 'running' || entry.ownerId !== params.ownerId) return false;
  await tx.put({ ...entry, leaseExpiresAt: params.leaseExpiresAt, updatedAt: params.now });
  return true;
}

/** Retry a dead-letter job back to queued. Returns discriminated result. */
export async function retryJob(tx: StoreTx, id: string, now: number): Promise<RetryResult> {
  const entry = await tx.get(id);
  if (!entry) return { status: 'not-found' };
  if (entry.status === 'running') return { status: 'running' };
  if (entry.status !== 'dead-letter') return { status: 'not-dead-letter' };
  const retried: StoredJob = {
    ...entry,
    availableAt: now,
    failure: undefined,
    status: 'queued',
    updatedAt: now,
  };
  await tx.put(retried);
  return { entry: toEntry(retried), status: 'retried' };
}

/** Remove a queued or dead-letter job. Running jobs cannot be removed. */
export async function removeJob(tx: StoreTx, id: string): Promise<RemoveResult> {
  const entry = await tx.get(id);
  if (!entry) return { status: 'not-found' };
  if (entry.status === 'running') return { status: 'running' };
  await tx.delete(id);
  return { id, status: 'removed' };
}

/** Enqueue a new job. Rejects duplicate ids. */
export async function enqueueJob(tx: StoreTx, entry: StoredJob): Promise<void> {
  const existing = await tx.get(entry.id);
  if (existing) throw new PostmasterJobError(`Postmaster entry "${entry.id}" already exists`);
  await tx.put(entry);
}

export function toEntry(entry: StoredJob): PostmasterEntry {
  return {
    attempts: entry.attempts,
    availableAt: entry.availableAt,
    createdAt: entry.createdAt,
    ...(entry.failure ? { failure: entry.failure } : {}),
    id: entry.id,
    key: entry.key,
    name: entry.name,
    status: entry.status,
    updatedAt: entry.updatedAt,
    version: entry.version,
  };
}
