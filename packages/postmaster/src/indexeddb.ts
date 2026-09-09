import { isPlainObject } from '@vielzeug/arsenal';
import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';
import { normalize } from './_store-utils.ts';
import { PostmasterError } from './errors.ts';
import type {
  EntryFilter,
  EntryStatus,
  JsonValue,
  PostmasterStats,
  PostmasterStore,
  StoredFailure,
  StoredJob,
  StoreTx,
} from './types.ts';

const CORRUPT = Symbol('corrupt');

type CorruptRecord = {
  readonly [CORRUPT]: CorruptStoredJob;
  readonly availableAt?: number;
  readonly id: string;
  readonly leaseExpiresAt?: number;
  readonly status?: EntryStatus;
};

type DatabaseJob = CorruptRecord | StoredJob;

type PostmasterSchema = {
  jobs: ReturnType<typeof table<DatabaseJob, 'id'>>;
};

export interface CorruptStoredJob {
  readonly id?: string;
  readonly reason: string;
}

type IndexedDbPostmasterStoreOptions = {
  readonly name: string;
  readonly onCorruptRecord?: (record: CorruptStoredJob) => void;
};

const ENTRY_STATUSES: readonly EntryStatus[] = ['dead-letter', 'queued', 'running'];

function isEntryStatus(value: unknown): value is EntryStatus {
  return typeof value === 'string' && ENTRY_STATUSES.includes(value as EntryStatus);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isTimestamp(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isJsonValue(value: unknown, seen = new Set<object>()): value is JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;

  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, seen))
    : isPlainObject(value) && Object.values(value).every((item) => isJsonValue(item, seen));
  seen.delete(value);
  return valid;
}

function isStoredFailure(value: unknown): value is StoredFailure {
  return (
    isPlainObject(value) &&
    typeof value.message === 'string' &&
    isNonEmptyString(value.name) &&
    isTimestamp(value.occurredAt)
  );
}

/**
 * Validates that persisted data conforms to the {@link StoredJob} shape before
 * it re-enters Postmaster's in-memory world. Replaces the prior no-op cast and
 * enforces Vault's required-codec boundary on durable records.
 */
function parseStoredJob(value: unknown): StoredJob {
  if (!isPlainObject(value)) {
    throw new PostmasterError('invalid stored job: expected a plain object');
  }

  const {
    id,
    name,
    key,
    status,
    version,
    payload,
    attempts,
    availableAt,
    createdAt,
    updatedAt,
    failure,
    leaseExpiresAt,
    ownerId,
  } = value;

  if (!isNonEmptyString(id)) throw new PostmasterError('invalid stored job: id must be a non-empty string');
  if (!isNonEmptyString(name)) throw new PostmasterError('invalid stored job: name must be a non-empty string');
  if (!isNonEmptyString(key)) throw new PostmasterError('invalid stored job: key must be a non-empty string');
  if (!isEntryStatus(status)) {
    throw new PostmasterError('invalid stored job: status must be one of dead-letter, queued, running');
  }
  if (!isNonNegativeInteger(version) || version < 1) {
    throw new PostmasterError('invalid stored job: version must be a positive integer');
  }
  if (!isJsonValue(payload)) throw new PostmasterError('invalid stored job: payload must be a JSON value');
  if (!isNonNegativeInteger(attempts)) {
    throw new PostmasterError('invalid stored job: attempts must be a non-negative integer');
  }
  if (!isTimestamp(availableAt)) throw new PostmasterError('invalid stored job: availableAt must be a timestamp');
  if (!isTimestamp(createdAt)) throw new PostmasterError('invalid stored job: createdAt must be a timestamp');
  if (!isTimestamp(updatedAt)) throw new PostmasterError('invalid stored job: updatedAt must be a timestamp');
  if (failure !== undefined && !isStoredFailure(failure)) {
    throw new PostmasterError('invalid stored job: failure must be a StoredFailure');
  }

  if (status === 'running') {
    if (attempts < 1) throw new PostmasterError('invalid stored job: running jobs must have an attempt');
    if (!isTimestamp(leaseExpiresAt)) {
      throw new PostmasterError('invalid stored job: running jobs must have a lease expiry');
    }
    if (!isNonEmptyString(ownerId)) {
      throw new PostmasterError('invalid stored job: running jobs must have an owner');
    }
    if (failure !== undefined) throw new PostmasterError('invalid stored job: running jobs must not have a failure');
  } else if (leaseExpiresAt !== undefined || ownerId !== undefined) {
    throw new PostmasterError('invalid stored job: only running jobs may have lease ownership');
  }

  return {
    attempts,
    availableAt,
    createdAt,
    id,
    key,
    name,
    payload,
    status,
    updatedAt,
    version,
    ...(failure !== undefined ? { failure } : {}),
    ...(leaseExpiresAt !== undefined ? { leaseExpiresAt } : {}),
    ...(ownerId !== undefined ? { ownerId } : {}),
  };
}

function isValidRecord(record: DatabaseJob): record is StoredJob {
  return !(CORRUPT in record);
}

function wrap<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch((cause: unknown) => {
    if (cause instanceof PostmasterError) throw cause;
    throw new PostmasterError(`${operation} failed`, { cause });
  });
}

export function createIndexedDbPostmasterStore(options: IndexedDbPostmasterStoreOptions): PostmasterStore {
  const reported = new Set<string>();
  const decode = (value: unknown): DatabaseJob => {
    try {
      return parseStoredJob(value);
    } catch (cause) {
      const id = isPlainObject(value) && isNonEmptyString(value.id) ? value.id : undefined;
      const reason = cause instanceof Error ? cause.message : String(cause);
      const issue: CorruptStoredJob = { ...(id === undefined ? {} : { id }), reason };
      const signature = `${id ?? ''}\u0000${reason}`;
      if (!reported.has(signature)) {
        reported.add(signature);
        try {
          options.onCorruptRecord?.(issue);
        } catch {}
      }
      return {
        [CORRUPT]: issue,
        id: id ?? '',
        ...(isPlainObject(value) && isTimestamp(value.availableAt) ? { availableAt: value.availableAt } : {}),
        ...(isPlainObject(value) && isTimestamp(value.leaseExpiresAt) ? { leaseExpiresAt: value.leaseExpiresAt } : {}),
        ...(isPlainObject(value) && isEntryStatus(value.status) ? { status: value.status } : {}),
      };
    }
  };
  const schema: PostmasterSchema = {
    jobs: table<DatabaseJob, 'id'>('id', {
      indexes: ['availableAt', 'leaseExpiresAt', 'status'],
    }),
  };
  const vault = createIndexedDB({
    codecs: {
      jobs: {
        decode,
        encode: (record) => {
          if (!isValidRecord(record)) throw new PostmasterError('cannot persist a corrupt stored job');
          return parseStoredJob(record);
        },
      },
    },
    name: options.name,
    schema,
  });

  const buildTx = (vaultTx: Parameters<Parameters<typeof vault.batch>[1]>[0]): StoreTx => ({
    async countByStatus(): Promise<PostmasterStats> {
      const entries = (await vaultTx.getAll('jobs')).filter(isValidRecord);
      let queued = 0;
      let running = 0;
      let deadLetter = 0;
      for (const entry of entries) {
        if (entry.status === 'queued') queued += 1;
        else if (entry.status === 'running') running += 1;
        else if (entry.status === 'dead-letter') deadLetter += 1;
      }
      return { deadLetter, queued, running };
    },
    async delete(id: string): Promise<void> {
      await vaultTx.delete('jobs', id);
    },
    async findClaimable(now: number): Promise<StoredJob | undefined> {
      const entries = (await vaultTx.getAll('jobs')).filter(isValidRecord);
      const candidates = entries.filter(
        (entry) =>
          (entry.status === 'queued' && entry.availableAt <= now) ||
          (entry.status === 'running' && (entry.leaseExpiresAt ?? 0) <= now),
      );
      candidates.sort((a, b) => a.availableAt - b.availableAt || a.createdAt - b.createdAt);
      return candidates[0] ? normalize(candidates[0]) : undefined;
    },
    async findNextWake(now: number): Promise<number | undefined> {
      const entries = (await vaultTx.getAll('jobs')).filter(isValidRecord);
      let next: number | undefined;
      for (const entry of entries) {
        let wake: number | undefined;
        if (entry.status === 'queued' && entry.availableAt > now) wake = entry.availableAt;
        else if (entry.status === 'running' && (entry.leaseExpiresAt ?? 0) > now) wake = entry.leaseExpiresAt;
        if (wake !== undefined && (next === undefined || wake < next)) next = wake;
      }
      return next;
    },
    async get(id: string): Promise<StoredJob | undefined> {
      const entry = await vaultTx.get('jobs', id);
      return entry && isValidRecord(entry) ? normalize(entry) : undefined;
    },
    async put(entry: StoredJob): Promise<void> {
      await vaultTx.put('jobs', normalize(entry));
    },
  });

  return {
    get disposalSignal() {
      return vault.disposalSignal;
    },
    dispose(): Promise<void> {
      return wrap('disposing IndexedDB store', () => vault.dispose());
    },
    get disposed() {
      return vault.disposed;
    },
    list(filter?: EntryFilter): Promise<StoredJob[]> {
      return wrap('listing jobs', async () => {
        const entries =
          filter?.status === undefined
            ? await vault.getAll('jobs')
            : await vault.getAllByIndex('jobs', 'status', filter.status);
        return entries
          .filter(isValidRecord)
          .sort((a, b) => a.createdAt - b.createdAt)
          .map(normalize);
      });
    },
    subscribe(listener: () => void): () => void {
      return vault.observe('jobs', () => listener(), { immediate: false });
    },
    transact<T>(fn: (tx: StoreTx) => Promise<T>): Promise<T> {
      return wrap('executing transaction', () => vault.batch(['jobs'], async (vaultTx) => fn(buildTx(vaultTx))));
    },
    async [Symbol.asyncDispose](): Promise<void> {
      await vault.dispose();
    },
  };
}

export type { IndexedDbPostmasterStoreOptions };
