export type CacheOptions = {
  capacity?: number;
  now?: () => number;
  ttlMs?: number;
};

type Entry<T> = {
  expiresAt: number | undefined;
  value: T;
};

export interface Cache<K, T> {
  clear(): void;
  delete(key: K): boolean;
  get(key: K): T | undefined;
  getOrLoad(key: K, load: () => Promise<T>): Promise<T>;
  set(key: K, value: T, options?: { ttlMs?: number }): void;
  readonly size: number;
}

export function cache<K, T>({ capacity = Infinity, now = Date.now, ttlMs }: CacheOptions = {}): Cache<K, T> {
  if (capacity !== Infinity && (!Number.isInteger(capacity) || capacity < 1)) {
    throw new RangeError(`cache: capacity must be a positive integer or Infinity, got ${capacity}`);
  }

  const entries = new Map<K, Entry<T>>();
  const pending = new Map<K, Promise<T>>();
  const revisions = new Map<K, number>();
  let generation = 0;

  const advanceRevision = (key: K): number => {
    const revision = (revisions.get(key) ?? 0) + 1;

    revisions.set(key, revision);

    return revision;
  };

  const expiresAt = (duration: number | undefined): number | undefined => {
    if (duration === undefined || duration === Infinity) return undefined;

    if (!Number.isFinite(duration) || duration < 0) {
      throw new RangeError(`cache: ttlMs must be a non-negative finite number or Infinity, got ${duration}`);
    }

    return now() + duration;
  };

  const read = (key: K): T | undefined => {
    const entry = entries.get(key);

    if (!entry) return undefined;

    if (entry.expiresAt !== undefined && entry.expiresAt <= now()) {
      entries.delete(key);

      return undefined;
    }

    return entry.value;
  };

  const trim = (): void => {
    for (const [key, entry] of entries) {
      if (entry.expiresAt !== undefined && entry.expiresAt <= now()) entries.delete(key);
    }

    while (entries.size > capacity) {
      const oldest = entries.keys().next().value;

      if (oldest === undefined) return;

      entries.delete(oldest);
    }
  };

  const set = (key: K, value: T, options: { ttlMs?: number } = {}): void => {
    advanceRevision(key);
    entries.delete(key);
    entries.set(key, { expiresAt: expiresAt(options.ttlMs ?? ttlMs), value });
    trim();
  };

  const getOrLoad = (key: K, load: () => Promise<T>): Promise<T> => {
    const cached = read(key);

    if (cached !== undefined || entries.has(key)) return Promise.resolve(cached as T);

    const existing = pending.get(key);

    if (existing) return existing;

    const capturedGeneration = generation;
    const capturedRevision = advanceRevision(key);
    const result = load().then(
      (value) => {
        if (pending.get(key) === result) pending.delete(key);

        if (generation === capturedGeneration && revisions.get(key) === capturedRevision) {
          set(key, value);
        }

        return value;
      },
      (error: unknown) => {
        if (pending.get(key) === result) pending.delete(key);

        throw error;
      },
    );

    pending.set(key, result);

    return result;
  };

  return {
    clear: () => {
      generation++;
      entries.clear();
      pending.clear();
      revisions.clear();
    },
    delete: (key) => {
      pending.delete(key);
      advanceRevision(key);

      return entries.delete(key);
    },
    get: read,
    getOrLoad,
    set,
    get size() {
      return entries.size;
    },
  };
}
