import { ArsenalError } from '../errors';
import { isPromise } from '../guards/isPromise';

type CacheRecord<K, T> = {
  key: K;
  value: T;
};

export type CachePersistence<T> = {
  /** Deserializes a stored string back into a value of type `T`. */
  deserialize: (raw: string) => T;
  /** Serializes a value to a string for internal storage. */
  serialize: (value: T) => string;
};

export type CacheOptions<K = string, T = unknown> = {
  /**
   * Converts a key to its canonical string representation for internal storage.
   * Defaults to `String(key)` — suitable for all string, number, and symbol keys.
   * Provide a custom function for object keys or composite keys.
   */
  hash?: (key: K) => string;
  /**
   * Maximum number of entries to hold. When the store reaches capacity, the oldest
   * entry is evicted (FIFO) before inserting the new one. `onEvict` is called on
   * capacity evictions just like TTL evictions.
   *
   * Default: `Infinity` (unbounded).
   */
  maxSize?: number;
  onEvict?: (key: K, value: T) => void;
  /**
   * Optional serialization pair for persistent caches (e.g. localStorage, cross-process IPC).
   * Both `serialize` and `deserialize` must be provided together.
   *
   * @example
   * ```ts
   * const cache = stash<User>({
   *   persistence: {
   *     serialize: (u) => JSON.stringify(u),
   *     deserialize: (raw) => JSON.parse(raw) as User,
   *   },
   * });
   * ```
   */
  persistence?: CachePersistence<T>;
  /**
   * Default time-to-live for all entries in milliseconds.
   * Applied automatically to every `set()` and `getOrSet()` call unless
   * overridden per-entry via `CacheSetOptions.ttlMs`.
   *
   * Default: `undefined` (entries do not expire).
   */
  ttlMs?: number;
};

export type CacheSetOptions = {
  /**
   * When `true`, bypasses both the cache and any in-flight promise for this key,
   * and always calls the factory. The new value replaces the old cache entry.
   * **Note:** if a prior in-flight is still pending when `forceRefresh` resolves,
   * whichever `.then` runs last will write the cache slot — ensure prior in-flight
   * tasks have settled if ordering matters.
   */
  forceRefresh?: boolean;
  ttlMs?: number;
};

export type Stash<T, K = string> = {
  clear: () => void;
  delete: (key: K) => boolean;
  entries: () => IterableIterator<[K, T]>;
  get: (key: K) => T | undefined;
  /**
   * Returns the cached value for `key`, or invokes `factory` to produce and cache it.
   * Pass `{ forceRefresh: true }` to skip the cache and always call `factory`.
   */
  getOrSet(key: K, factory: () => T, options?: CacheSetOptions): T;
  getOrSet(key: K, factory: () => Promise<T>, options?: CacheSetOptions): Promise<T>;
  set: (key: K, value: T, options?: CacheSetOptions) => void;
  readonly size: number;
};

/**
 * Creates a generic key-value cache with TTL-based garbage collection, optional capacity
 * limit (FIFO eviction), async stampede prevention, and optional eviction callback.
 *
 * This is the single caching primitive in arsenal — use it for simple bounded caches,
 * TTL caches, or async deduplication/stampede prevention.
 *
 * @example
 * ```ts
 * // Simple string cache — no options needed for string keys
 * const myCache = stash<string>();
 * myCache.set('user:1', 'John Doe');
 * const value = myCache.get('user:1'); // 'John Doe'
 *
 * // Global TTL — all entries expire after 60 seconds unless overridden
 * const apiCache = stash<Response>({ ttlMs: 60_000 });
 * apiCache.set('data', response);             // expires in 60s
 * apiCache.set('data', response, { ttlMs: 5_000 }); // override: expires in 5s
 *
 * // Async getOrSet prevents stampedes — concurrent callers share one in-flight promise
 * const user = await myCache.getOrSet('user:1', () => fetchUser(1));
 *
 * // Bounded FIFO cache
 * const fmtCache = stash<Intl.NumberFormat>({ maxSize: 64 });
 * const fmt = fmtCache.getOrSet('en-US', () => new Intl.NumberFormat('en-US'));
 *
 * // Custom key type — provide a hash function
 * const objCache = stash<Result, { id: number }>({ hash: (k) => String(k.id) });
 *
 * // Note: `undefined` is a valid cached value — if a key is set to `undefined`,
 * // `getOrSet` returns it without invoking the factory again.
 * ```
 *
 * @template T - The type of values stored in the cache.
 * @template K - The key type. Defaults to `string`.
 */
export function stash<T, K = string>(options: CacheOptions<K, T> = {}): Stash<T, K> {
  const store = new Map<string, CacheRecord<K, T>>();
  const gcTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const inFlight = new Map<string, Promise<T>>();
  const hash = options.hash ?? ((key: K) => String(key));
  const onEvict = options.onEvict;
  const maxSize = options.maxSize ?? Infinity;
  const defaultTtlMs = options.ttlMs;
  const persistence = options.persistence;
  let generation = 0;
  const deletedWhileInFlight = new Set<string>();

  function evictOldestIfOverCapacity(): void {
    if (store.size > maxSize) {
      const [firstHash] = store.keys();

      if (firstHash !== undefined) {
        deleteByHash(firstHash);
      }
    }
  }

  function cancelGcByHash(keyHash: string): void {
    const id = gcTimers.get(keyHash);

    if (id !== undefined) {
      clearTimeout(id);
      gcTimers.delete(keyHash);
    }
  }

  function deleteByHash(keyHash: string): boolean {
    const record = store.get(keyHash);

    cancelGcByHash(keyHash);

    if (record) {
      onEvict?.(record.key, record.value);
      store.delete(keyHash);
    }

    if (inFlight.has(keyHash)) deletedWhileInFlight.add(keyHash);

    return record !== undefined;
  }

  function scheduleGcByHash(keyHash: string, delayMs: number): void {
    cancelGcByHash(keyHash);

    if (delayMs === Number.POSITIVE_INFINITY) return;

    if (!Number.isFinite(delayMs)) {
      throw new ArsenalError('stash: ttlMs must be a finite number or Infinity');
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

  function deserializeValue(raw: T): T {
    if (persistence && typeof raw === 'string') return persistence.deserialize(raw);

    return raw;
  }

  function get(key: K): T | undefined {
    const record = store.get(hash(key));

    return record ? deserializeValue(record.value) : undefined;
  }

  function set(key: K, value: T, opts?: CacheSetOptions): void {
    const keyHash = hash(key);
    const stored = persistence ? (persistence.serialize(value) as unknown as T) : value;

    cancelGcByHash(keyHash);
    store.set(keyHash, { key, value: stored });
    evictOldestIfOverCapacity();

    const ttl = opts?.ttlMs ?? defaultTtlMs;

    if (ttl !== undefined) {
      scheduleGcByHash(keyHash, ttl);
    }
  }

  function getOrSet(key: K, factory: () => T | Promise<T>, opts?: CacheSetOptions): T | Promise<T> {
    const keyHash = hash(key);

    if (store.has(keyHash) && !opts?.forceRefresh) return get(key) as T;

    const pending = inFlight.get(keyHash);

    if (pending && !opts?.forceRefresh) return pending;

    const value = factory();

    if (isPromise(value)) {
      const capturedGeneration = generation;
      const promise = value
        .then((resolved) => {
          inFlight.delete(keyHash);

          if (generation === capturedGeneration && !deletedWhileInFlight.has(keyHash)) {
            set(key, resolved, opts);
          }

          deletedWhileInFlight.delete(keyHash);

          return resolved;
        })
        .catch((err: unknown) => {
          inFlight.delete(keyHash);
          deletedWhileInFlight.delete(keyHash);
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
    deletedWhileInFlight.clear();
  }

  function* entries(): IterableIterator<[K, T]> {
    for (const record of store.values()) {
      yield [record.key, deserializeValue(record.value)];
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
      return store.size;
    },
  };
}
