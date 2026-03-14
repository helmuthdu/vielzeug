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
  const metadata = new Map<string, Record<string, unknown>>();

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
    for (const timer of gcTimers.values()) clearTimeout(timer);
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
    metadata.set(hash(key), meta);
  }

  function getMeta(key: readonly unknown[]): Record<string, unknown> | undefined {
    return metadata.get(hash(key));
  }

  function clearGc(keyHash: string): void {
    clearTimeout(gcTimers.get(keyHash));
    gcTimers.delete(keyHash);
  }

  return {
    clear,
    delete: del,
    get,
    getMeta,
    scheduleGc,
    set,
    setMeta,
    size,
  };
}
