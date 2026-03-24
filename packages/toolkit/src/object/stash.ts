import { Scheduler, type SchedulerLike } from '../async';

type CacheKey = readonly unknown[];

type CacheRecord<K extends CacheKey, T, M> = {
  key: K;
  meta: M | undefined;
  value: T;
};

type GcTask = {
  controller: AbortController;
  token: number;
};

export type CacheOptions<K extends CacheKey = CacheKey> = {
  hash: (key: K) => string;
  onError?: (error: unknown) => void;
  scheduler?: Pick<SchedulerLike, 'postTask'>;
};

export type CacheSetOptions<M> = {
  meta?: M;
  ttlMs?: number;
};

export type Stash<T, K extends CacheKey = CacheKey, M = never> = {
  cancelGc: (key: K) => void;
  clear: () => void;
  delete: (key: K) => boolean;
  entries: () => IterableIterator<[K, T]>;
  get: (key: K) => T | undefined;
  getEntry: (key: K) => Readonly<{ meta: M | undefined; value: T }> | undefined;
  getOrSet: (key: K, factory: () => T, options?: CacheSetOptions<M>) => T;
  scheduleGc: (key: K, delayMs: number) => void;
  set: (key: K, value: T, options?: CacheSetOptions<M>) => void;
  size: () => number;
  touch: (key: K, ttlMs: number) => boolean;
};

/**
 * Creates a generic key-value cache with automatic garbage collection and observer support.
 *
 * @example
 * ```ts
 * const myCache = stash<string>({ hash: (key) => JSON.stringify(key) });
 * myCache.set(['user', 1], 'John Doe');
 * const value = myCache.get(['user', 1]); // 'John Doe'
 * myCache.scheduleGc(['user', 1], 5000); // Auto-delete after 5s
 * ```
 *
 * @template T - The type of values stored in the cache.
 *
 * @returns A cache instance with get, set, delete, clear, and GC methods.
 */
export function stash<T, K extends CacheKey = CacheKey, M = never>(options: CacheOptions<K>): Stash<T, K, M> {
  const store = new Map<string, CacheRecord<K, T, M>>();
  const gcTasks = new Map<string, GcTask>();
  const scheduler = options.scheduler ?? new Scheduler();
  const hash = options.hash;
  let gcToken = 0;

  function cancelGcByHash(keyHash: string): void {
    gcTasks.get(keyHash)?.controller.abort();
    gcTasks.delete(keyHash);
  }

  function deleteByHash(keyHash: string): boolean {
    const existed = store.has(keyHash);

    cancelGcByHash(keyHash);
    store.delete(keyHash);

    return existed;
  }

  function get(key: K): T | undefined {
    return store.get(hash(key))?.value;
  }

  function getEntry(key: K): Readonly<{ meta: M | undefined; value: T }> | undefined {
    const entry = store.get(hash(key));

    if (!entry) {
      return undefined;
    }

    return { meta: entry.meta, value: entry.value };
  }

  function set(key: K, value: T, options?: CacheSetOptions<M>): void {
    const keyHash = hash(key);
    const existing = store.get(keyHash);

    cancelGcByHash(keyHash);
    store.set(keyHash, {
      key,
      meta: options && 'meta' in options ? options.meta : existing?.meta,
      value,
    });

    if (options?.ttlMs !== undefined) {
      scheduleGc(key, options.ttlMs);
    }
  }

  function getOrSet(key: K, factory: () => T, options?: CacheSetOptions<M>): T {
    const existing = getEntry(key);

    if (existing) {
      return existing.value;
    }

    const value = factory();

    set(key, value, options);

    return value;
  }

  function del(key: K): boolean {
    return deleteByHash(hash(key));
  }

  function clear(): void {
    for (const task of gcTasks.values()) task.controller.abort();
    store.clear();
    gcTasks.clear();
  }

  function size(): number {
    return store.size;
  }

  function scheduleGcByHash(keyHash: string, delayMs: number): void {
    cancelGcByHash(keyHash);

    if (delayMs === Number.POSITIVE_INFINITY) {
      return;
    }

    if (!Number.isFinite(delayMs)) {
      throw new TypeError('stash.scheduleGc expects a finite number or Infinity');
    }

    if (delayMs <= 0) {
      deleteByHash(keyHash);

      return;
    }

    if (!store.has(keyHash)) {
      return;
    }

    const controller = new AbortController();
    const token = ++gcToken;

    gcTasks.set(keyHash, { controller, token });
    void scheduler
      .postTask(
        () => {
          const current = gcTasks.get(keyHash);

          if (!current || current.token !== token) {
            return;
          }

          gcTasks.delete(keyHash);

          deleteByHash(keyHash);
        },
        {
          delay: delayMs,
          priority: 'background',
          signal: controller.signal,
        },
      )
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        options.onError?.(error);
      });
  }

  function scheduleGc(key: K, delayMs: number): void {
    scheduleGcByHash(hash(key), delayMs);
  }

  function cancelGc(key: K): void {
    cancelGcByHash(hash(key));
  }

  function touch(key: K, ttlMs: number): boolean {
    const keyHash = hash(key);

    if (!store.has(keyHash)) {
      return false;
    }

    scheduleGcByHash(keyHash, ttlMs);

    return true;
  }

  function* entries(): IterableIterator<[K, T]> {
    for (const record of store.values()) {
      yield [record.key, record.value];
    }
  }

  return {
    cancelGc,
    clear,
    delete: del,
    entries,
    get,
    getEntry,
    getOrSet,
    scheduleGc,
    set,
    size,
    touch,
  };
}
