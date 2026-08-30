import { table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';
import { normalize } from './_store-utils.ts';
import { PostmasterError } from './errors.ts';
import type { EntryFilter, PostmasterStats, PostmasterStore, StoredJob, StoreTx } from './types.ts';

type PostmasterSchema = {
  jobs: ReturnType<typeof table<StoredJob, 'id'>>;
};

type IndexedDbPostmasterStoreOptions = {
  readonly name: string;
};

function wrap<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch((cause: unknown) => {
    if (cause instanceof PostmasterError) throw cause;
    throw new PostmasterError(`${operation} failed`, { cause });
  });
}

export function createIndexedDbPostmasterStore(options: IndexedDbPostmasterStoreOptions): PostmasterStore {
  const schema: PostmasterSchema = {
    jobs: table<StoredJob, 'id'>('id', {
      indexes: ['availableAt', 'leaseExpiresAt', 'status'],
    }),
  };
  const vault = createIndexedDB({ name: options.name, schema });

  const buildTx = (vaultTx: Parameters<Parameters<typeof vault.batch>[1]>[0]): StoreTx => ({
    async countByStatus(): Promise<PostmasterStats> {
      const [queued, running, deadLetter] = await Promise.all([
        vaultTx.query('jobs').equals('status', 'queued').count(),
        vaultTx.query('jobs').equals('status', 'running').count(),
        vaultTx.query('jobs').equals('status', 'dead-letter').count(),
      ]);
      return { deadLetter, queued, running };
    },
    async delete(id: string): Promise<void> {
      await vaultTx.delete('jobs', id);
    },
    async findClaimable(now: number): Promise<StoredJob | undefined> {
      const candidates = await vaultTx
        .query('jobs')
        .filter(
          (entry) =>
            (entry.status === 'queued' && entry.availableAt <= now) ||
            (entry.status === 'running' && (entry.leaseExpiresAt ?? 0) <= now),
        )
        .toArray();
      const entry = candidates.sort((a, b) => a.availableAt - b.availableAt || a.createdAt - b.createdAt)[0];
      return entry ? normalize(entry) : undefined;
    },
    async findNextWake(now: number): Promise<number | undefined> {
      const entries = await vaultTx.getAll('jobs');
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
      return entry ? normalize(entry) : undefined;
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
        const query = vault.query('jobs');
        const entries =
          filter?.status === undefined ? await query.toArray() : await query.equals('status', filter.status).toArray();
        return entries.sort((a, b) => a.createdAt - b.createdAt).map(normalize);
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
