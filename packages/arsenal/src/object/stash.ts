type CacheRecord<K, T> = {
  key: K;
  value: T;
};

export type CacheOptions<K = string, T = unknown> = {
  hash: (key: K) => string;
  onEvict?: (key: K, value: T) => void;
};

export type CacheSetOptions = {
  ttlMs?: number;
};

export type Stash<T, K = string> = {
  clear: () => void;
  delete: (key: K) => boolean;
  entries: () => IterableIterator<[K, T]>;
  get: (key: K) => T | undefined;
  getOrSet(key: K, factory: () => T, options?: CacheSetOptions): T;
  getOrSet(key: K, factory: () => Promise<T>, options?: CacheSetOptions): Promise<T>;
  set: (key: K, value: T, options?: CacheSetOptions) => void;
  readonly size: number;
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
export function stash<T, K = string>(options: CacheOptions<K, T>): Stash<T, K> {
  const store = new Map<string, CacheRecord<K, T>>();
  const gcTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const inFlight = new Map<string, Promise<T>>();
  const hash = options.hash;
  const onEvict = options.onEvict;
  let generation = 0;

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

  function scheduleGcByHash(keyHash: string, delayMs: number): void {
    cancelGcByHash(keyHash);

    if (delayMs === Number.POSITIVE_INFINITY) return;

    if (!Number.isFinite(delayMs)) {
      throw new TypeError('stash: ttlMs must be a finite number or Infinity');
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

  function get(key: K): T | undefined {
    return store.get(hash(key))?.value;
  }

  function set(key: K, value: T, opts?: CacheSetOptions): void {
    const keyHash = hash(key);

    cancelGcByHash(keyHash);
    store.set(keyHash, { key, value });

    if (opts?.ttlMs !== undefined) {
      scheduleGcByHash(keyHash, opts.ttlMs);
    }
  }

  function getOrSet(key: K, factory: () => T | Promise<T>, opts?: CacheSetOptions): T | Promise<T> {
    const keyHash = hash(key);

    if (store.has(keyHash)) return store.get(keyHash)!.value;

    const pending = inFlight.get(keyHash);

    if (pending) return pending;

    const value = factory();

    if (value instanceof Promise) {
      const capturedGeneration = generation;
      const promise = value
        .then((resolved) => {
          inFlight.delete(keyHash);

          if (generation === capturedGeneration) set(key, resolved, opts);

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
    generation++;
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

  function getSize(): number {
    return store.size;
  }

  function* entries(): IterableIterator<[K, T]> {
    for (const record of store.values()) {
      yield [record.key, record.value];
    }
  }

  return {
    clear,
    delete: del,
    entries,
    get,
    getOrSet: getOrSet as Stash<T, K>['getOrSet'],
    set,
    get size() {
      return getSize();
    },
  };
}
