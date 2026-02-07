/**
 * Creates a generic key-value cache with automatic garbage collection and observer support.
 *
 * @example
 * ```ts
 * const myCache = cache<string>();
 * myCache.set(['user', 1], 'John Doe');
 * const value = myCache.get(['user', 1]); // 'John Doe'
 * myCache.scheduleGc(['user', 1], 5000); // Auto-delete after 5s
 * ```
 *
 * @template T - The type of values stored in the cache.
 *
 * @returns A cache instance with get, set, delete, clear, and GC methods.
 */
export function cache<T>() {
  const store = new Map<string, T>();
  const gcTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const metadata = new Map<string, { lastUsedAt: number }>();

  const hash = (key: readonly unknown[]) => JSON.stringify(key);

  function get(key: readonly unknown[]): T | undefined {
    return store.get(hash(key));
  }

  function set(key: readonly unknown[], value: T): void {
    store.set(hash(key), value);
  }

  function del(key: readonly unknown[]): boolean {
    const h = hash(key);
    clearGc(h);
    metadata.delete(h);
    return store.delete(h);
  }

  function clear(): void {
    gcTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    store.clear();
    gcTimers.clear();
    metadata.clear();
  }

  function size(): number {
    return store.size;
  }

  function scheduleGc(key: readonly unknown[], delayMs: number): void {
    const h = hash(key);
    clearGc(h);
    gcTimers.set(
      h,
      setTimeout(() => {
        store.delete(h);
        gcTimers.delete(h);
        metadata.delete(h);
      }, delayMs),
    );
  }

  function setMeta(key: readonly unknown[], meta: Record<string, unknown>): void {
    metadata.set(hash(key), { lastUsedAt: Date.now(), ...meta });
  }

  function getMeta(key: readonly unknown[]): Record<string, unknown> | undefined {
    return metadata.get(hash(key));
  }

  function getMetaByHash(keyHash: string): Record<string, unknown> | undefined {
    return metadata.get(keyHash);
  }

  function listMetaHashes(): string[] {
    return Array.from(metadata.keys());
  }

  function clearGc(keyHash: string): void {
    const timer = gcTimers.get(keyHash);
    if (timer) {
      clearTimeout(timer);
      gcTimers.delete(keyHash);
    }
  }

  return {
    clear,
    delete: del,
    get,
    getMeta,
    getMetaByHash,
    hash,
    listMetaHashes,
    scheduleGc,
    set,
    setMeta,
    size,
  };
}
