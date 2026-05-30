type CacheRecord<K, T, M> = {
  key: K;
  meta: M | undefined;
  value: T;
};

export type CacheOptions<K = string, T = unknown> = {
  hash: (key: K) => string;
  onEvict?: (key: K, value: T) => void;
};

export type CacheSetOptions<M> = {
  meta?: M;
  ttlMs?: number;
};

export type Stash<T, K = string, M = never> = {
  cancelGc: (key: K) => void;
  clear: () => void;
  delete: (key: K) => boolean;
  entries: () => IterableIterator<[K, T]>;
  get: (key: K) => T | undefined;
  getEntry: (key: K) => Readonly<{ meta: M | undefined; value: T }> | undefined;
  getOrSet(key: K, factory: () => Promise<T>, options?: CacheSetOptions<M>): Promise<T>;
  getOrSet(key: K, factory: () => T, options?: CacheSetOptions<M>): T;
  scheduleGc: (key: K, delayMs: number) => void;
  set: (key: K, value: T, options?: CacheSetOptions<M>) => void;
  size: () => number;
  touch: (key: K, ttlMs: number) => boolean;
};

/**
 * Creates a generic key-value cache with TTL-based garbage collection, async stampede
 * prevention, and optional eviction callback.
 *
 * @example
 * ```ts
 * const myCache = stash<string>({ hash: (key) => key });
 * myCache.set('user:1', 'John Doe', { ttlMs: 5000 });
 * const value = myCache.get('user:1'); // 'John Doe'
 *
 * // Async getOrSet prevents stampedes — concurrent callers share one in-flight promise
 * const user = await myCache.getOrSet('user:1', () => fetchUser(1));
 * ```
 *
 * @template T - The type of values stored in the cache.
 */
export function stash<T, K = string, M = never>(options: CacheOptions<K, T>): Stash<T, K, M> {
  const store = new Map<string, CacheRecord<K, T, M>>();
  const gcTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const inFlight = new Map<string, Promise<T>>();
  const hash = options.hash;
  const onEvict = options.onEvict;

  function cancelGcByHash(keyHash: string): void {
    const id = gcTimers.get(keyHash);

    if (id !== undefined) {
      clearTimeout(id);
      gcTimers.delete(keyHash);
    }
  }

  function deleteByHash(keyHash: string): boolean {
    const record = store.get(keyHash);

    if (!record) return false;

    cancelGcByHash(keyHash);
    onEvict?.(record.key, record.value);
    store.delete(keyHash);

    return true;
  }

  function get(key: K): T | undefined {
    return store.get(hash(key))?.value;
  }

  function getEntry(key: K): Readonly<{ meta: M | undefined; value: T }> | undefined {
    const entry = store.get(hash(key));

    if (!entry) return undefined;

    return { meta: entry.meta, value: entry.value };
  }

  function set(key: K, value: T, opts?: CacheSetOptions<M>): void {
    const keyHash = hash(key);
    const existing = store.get(keyHash);

    cancelGcByHash(keyHash);
    store.set(keyHash, {
      key,
      meta: opts && 'meta' in opts ? opts.meta : existing?.meta,
      value,
    });

    if (opts?.ttlMs !== undefined) {
      scheduleGc(key, opts.ttlMs);
    }
  }

  function getOrSet(key: K, factory: () => T | Promise<T>, opts?: CacheSetOptions<M>): T | Promise<T> {
    const existing = getEntry(key);

    if (existing) return existing.value;

    const keyHash = hash(key);

    // Stampede prevention: return the in-flight promise if one exists
    const pending = inFlight.get(keyHash);

    if (pending) return pending;

    const value = factory();

    if (value instanceof Promise) {
      const promise = value
        .then((resolved) => {
          inFlight.delete(keyHash);
          set(key, resolved, opts);

          return resolved;
        })
        .catch((err: unknown) => {
          inFlight.delete(keyHash);
          throw err;
        });

      inFlight.set(keyHash, promise);

      return promise;
    }

    set(key, value, opts);

    return value;
  }

  function del(key: K): boolean {
    return deleteByHash(hash(key));
  }

  function clear(): void {
    for (const id of gcTimers.values()) clearTimeout(id);

    if (onEvict) {
      for (const record of store.values()) {
        onEvict(record.key, record.value);
      }
    }

    store.clear();
    gcTimers.clear();
    inFlight.clear();
  }

  function size(): number {
    return store.size;
  }

  function scheduleGcByHash(keyHash: string, delayMs: number): void {
    cancelGcByHash(keyHash);

    if (delayMs === Number.POSITIVE_INFINITY) return;

    if (!Number.isFinite(delayMs)) {
      throw new TypeError('stash.scheduleGc expects a finite number or Infinity');
    }

    if (delayMs <= 0) {
      deleteByHash(keyHash);

      return;
    }

    if (!store.has(keyHash)) return;

    const id = setTimeout(() => {
      gcTimers.delete(keyHash);
      deleteByHash(keyHash);
    }, delayMs);

    gcTimers.set(keyHash, id);
  }

  function scheduleGc(key: K, delayMs: number): void {
    scheduleGcByHash(hash(key), delayMs);
  }

  function cancelGc(key: K): void {
    cancelGcByHash(hash(key));
  }

  function touch(key: K, ttlMs: number): boolean {
    const keyHash = hash(key);

    if (!store.has(keyHash)) return false;

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
    getOrSet: getOrSet as Stash<T, K, M>['getOrSet'],
    scheduleGc,
    set,
    size,
    touch,
  };
}
