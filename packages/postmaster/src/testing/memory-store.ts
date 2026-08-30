import { normalize } from '../_store-utils.ts';
import type { EntryFilter, PostmasterStats, PostmasterStore, StoredJob, StoreTx } from '../types.ts';

export function createMemoryPostmasterStore(entries: readonly StoredJob[] = []): PostmasterStore {
  const records = new Map(entries.map((entry) => [entry.id, normalize(entry)]));
  const controller = new AbortController();
  const listeners = new Set<() => void>();
  let disposed = false;
  let chain = Promise.resolve();

  const exclusive = <T>(fn: () => T | Promise<T>): Promise<T> => {
    const result = chain.then(fn, fn);
    chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const live = (): void => {
    if (disposed) throw new Error('Postmaster store is disposed');
  };

  const tx: StoreTx = {
    async countByStatus(): Promise<PostmasterStats> {
      let deadLetter = 0;
      let queued = 0;
      let running = 0;
      for (const entry of records.values()) {
        if (entry.status === 'dead-letter') deadLetter += 1;
        else if (entry.status === 'queued') queued += 1;
        else running += 1;
      }
      return { deadLetter, queued, running };
    },
    async delete(id: string): Promise<void> {
      records.delete(id);
    },
    async findClaimable(now: number): Promise<StoredJob | undefined> {
      let best: StoredJob | undefined;
      for (const entry of records.values()) {
        const claimable =
          (entry.status === 'queued' && entry.availableAt <= now) ||
          (entry.status === 'running' && (entry.leaseExpiresAt ?? 0) <= now);
        if (!claimable) continue;
        if (
          !best ||
          entry.availableAt < best.availableAt ||
          (entry.availableAt === best.availableAt && entry.createdAt < best.createdAt)
        ) {
          best = entry;
        }
      }
      return best ? normalize(best) : undefined;
    },
    async findNextWake(now: number): Promise<number | undefined> {
      let next: number | undefined;
      for (const entry of records.values()) {
        let wake: number | undefined;
        if (entry.status === 'queued' && entry.availableAt > now) wake = entry.availableAt;
        else if (entry.status === 'running' && (entry.leaseExpiresAt ?? 0) > now) wake = entry.leaseExpiresAt;
        if (wake !== undefined && (next === undefined || wake < next)) next = wake;
      }
      return next;
    },
    async get(id: string): Promise<StoredJob | undefined> {
      const entry = records.get(id);
      return entry ? normalize(entry) : undefined;
    },
    async put(entry: StoredJob): Promise<void> {
      records.set(entry.id, normalize(entry));
    },
  };

  return {
    get disposalSignal() {
      return controller.signal;
    },
    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      controller.abort();
      listeners.clear();
    },
    get disposed() {
      return disposed;
    },
    async list(filter?: EntryFilter): Promise<StoredJob[]> {
      return exclusive(() => {
        live();
        return [...records.values()]
          .filter((entry) => filter?.status === undefined || entry.status === filter.status)
          .sort((a, b) => a.createdAt - b.createdAt)
          .map(normalize);
      });
    },
    subscribe(listener: () => void): () => void {
      live();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    transact<T>(fn: (tx: StoreTx) => Promise<T>): Promise<T> {
      return exclusive(async () => {
        live();
        const result = await fn(tx);
        notify();
        return result;
      });
    },
    async [Symbol.asyncDispose](): Promise<void> {
      await this.dispose();
    },
  };
}
