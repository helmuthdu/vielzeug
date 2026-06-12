import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PersistStorage } from '../persist';

import { createQuery } from '../index';
import { hydrateQueryCache, persistQueryCache } from '../persist';

// ---------------------------------------------------------------------------
// In-memory storage backend
// ---------------------------------------------------------------------------

function makeStorage(initial: Record<string, string> = {}): PersistStorage & { store: Record<string, string> } {
  const store: Record<string, string> = { ...initial };

  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = value;
    },
    store,
  };
}

// ---------------------------------------------------------------------------
// persistQueryCache
// ---------------------------------------------------------------------------

describe('persistQueryCache', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('writes successful cache entries to storage', async () => {
    const qc = createQuery();
    const storage = makeStorage();

    persistQueryCache(qc, { keys: [['users', 1]], storage });

    qc.set(['users', 1], { id: 1, name: 'Alice' });

    const raw = storage.store['courier:["users",1]'];

    expect(raw).toBeDefined();

    const parsed = JSON.parse(raw) as { data: unknown };

    expect(parsed.data).toEqual({ id: 1, name: 'Alice' });
  });

  it('does not write idle or pending entries', async () => {
    const qc = createQuery();
    const storage = makeStorage();

    persistQueryCache(qc, { keys: [['users', 1]], storage });

    // No set() call — entry stays idle
    expect(Object.keys(storage.store)).toHaveLength(0);

    // Trigger a fetch that will stay in-flight (pending state)
    let resolveIt!: (v: unknown) => void;
    const fetchPromise = qc.fetch({
      fn: () => new Promise((r) => (resolveIt = r)),
      key: ['users', 1],
    });

    // Entry is now pending — must NOT be written to storage
    expect(Object.keys(storage.store)).toHaveLength(0);

    resolveIt({ id: 1 });
    await fetchPromise;
  });

  it('eagerly persists already-successful entries on setup', () => {
    const qc = createQuery();
    const storage = makeStorage();

    // Data is already in cache before persistence is wired up
    qc.set(['users', 1], { id: 1, name: 'Alice' });

    persistQueryCache(qc, { keys: [['users', 1]], storage });

    // Must be written immediately — not waiting for the next state change
    expect(storage.store['courier:["users",1]']).toBeDefined();

    const parsed = JSON.parse(storage.store['courier:["users",1]']) as { data: unknown };

    expect(parsed.data).toEqual({ id: 1, name: 'Alice' });
  });

  it('eager persist respects the include predicate', () => {
    const qc = createQuery();
    const storage = makeStorage();

    qc.set(['users', 1], { id: 1 });
    qc.set(['settings'], { theme: 'dark' });

    persistQueryCache(qc, {
      include: (key) => key[0] === 'users',
      keys: [['users', 1], ['settings']],
      storage,
    });

    expect(storage.store['courier:["users",1]']).toBeDefined();
    expect(storage.store['courier:["settings"]']).toBeUndefined();
  });

  it('serializes updatedAt into storage', () => {
    const qc = createQuery();
    const storage = makeStorage();
    const before = Date.now();

    persistQueryCache(qc, { keys: [['users', 1]], storage });
    qc.set(['users', 1], { id: 1 });

    const raw = JSON.parse(storage.store['courier:["users",1]']) as { data: unknown; updatedAt: number };

    expect(raw.updatedAt).toBeGreaterThanOrEqual(before);
    expect(raw.updatedAt).toBeLessThanOrEqual(Date.now());
  });

  it('uses a custom prefix', () => {
    const qc = createQuery();
    const storage = makeStorage();

    persistQueryCache(qc, { keys: [['users', 1]], prefix: 'app:', storage });

    qc.set(['users', 1], { id: 1 });

    expect(storage.store['app:["users",1]']).toBeDefined();
    expect(Object.keys(storage.store).filter((k) => k.startsWith('courier:'))).toHaveLength(0);
  });

  it('calls onError when setItem throws', () => {
    const qc = createQuery();
    const errorStorage: PersistStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
    };

    const onError = vi.fn();

    persistQueryCache(qc, { keys: [['users', 1]], onError, storage: errorStorage });

    qc.set(['users', 1], { id: 1 });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][1]).toEqual(['users', 1]);
  });

  it('calls onError when async setItem rejects', async () => {
    const qc = createQuery();
    const onError = vi.fn();
    const asyncErrorStorage: PersistStorage = {
      getItem: () => null,
      setItem: async () => Promise.reject(new Error('disk full')),
    };

    persistQueryCache(qc, { keys: [['users', 1]], onError, storage: asyncErrorStorage });

    qc.set(['users', 1], { id: 1 });

    // Let the rejected promise propagate
    await new Promise((r) => setTimeout(r, 0));

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('stop() unsubscribes and stops writing further updates', () => {
    const qc = createQuery();
    const storage = makeStorage();

    const stop = persistQueryCache(qc, { keys: [['users', 1]], storage });

    stop();

    qc.set(['users', 1], { id: 1 });

    expect(Object.keys(storage.store)).toHaveLength(0);
  });

  it('stop() is idempotent', () => {
    const qc = createQuery();
    const storage = makeStorage();

    const stop = persistQueryCache(qc, { keys: [['users', 1]], storage });

    expect(() => {
      stop();
      stop();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// hydrateQueryCache
// ---------------------------------------------------------------------------

describe('hydrateQueryCache', () => {
  it('hydrates cache entries from storage', async () => {
    const qc = createQuery();
    const storage = makeStorage({
      'courier:["users",1]': JSON.stringify({ data: { id: 1, name: 'Alice' }, updatedAt: Date.now() }),
    });

    await hydrateQueryCache(qc, { keys: [['users', 1]], storage });

    expect(qc.get(['users', 1])).toEqual({ id: 1, name: 'Alice' });
    expect(qc.getState(['users', 1])?.status).toBe('success');
  });

  it('uses the caller key, not any embedded key in the stored JSON', async () => {
    const qc = createQuery();
    // Stored JSON has a different "key" field (old format) — it must be ignored
    const storage = makeStorage({
      'courier:["users",1]': JSON.stringify({
        data: { id: 1 },
        key: ['users', 999], // stale / wrong
        updatedAt: Date.now(),
      }),
    });

    await hydrateQueryCache(qc, { keys: [['users', 1]], storage });

    expect(qc.get(['users', 1])).toEqual({ id: 1 });
    expect(qc.get(['users', 999])).toBeUndefined();
  });

  it('skips missing entries silently', async () => {
    const qc = createQuery();
    const storage = makeStorage(); // empty

    await hydrateQueryCache(qc, { keys: [['users', 1]], storage });

    expect(qc.getState(['users', 1])).toBeNull();
  });

  it('respects the include predicate', async () => {
    const qc = createQuery();
    const storage = makeStorage({
      'courier:["settings"]': JSON.stringify({ data: { theme: 'dark' }, updatedAt: Date.now() }),
      'courier:["users",1]': JSON.stringify({ data: { id: 1 }, updatedAt: Date.now() }),
    });

    await hydrateQueryCache(qc, {
      include: (key) => key[0] === 'users',
      keys: [['users', 1], ['settings']],
      storage,
    });

    expect(qc.get(['users', 1])).toEqual({ id: 1 });
    expect(qc.get(['settings'])).toBeUndefined();
  });

  it('uses a custom prefix', async () => {
    const qc = createQuery();
    const storage = makeStorage({
      'app:["users",1]': JSON.stringify({ data: { id: 1 }, updatedAt: Date.now() }),
    });

    await hydrateQueryCache(qc, { keys: [['users', 1]], prefix: 'app:', storage });

    expect(qc.get(['users', 1])).toEqual({ id: 1 });
  });

  it('calls onError and continues when a key fails', async () => {
    const qc = createQuery();
    const onError = vi.fn();

    // Second key has corrupt JSON
    const storage = makeStorage({
      'courier:["settings"]': 'this is not json{{{',
      'courier:["users",1]': JSON.stringify({ data: { id: 1 }, updatedAt: Date.now() }),
    });

    await hydrateQueryCache(qc, { keys: [['users', 1], ['settings']], onError, storage });

    // First key hydrated successfully
    expect(qc.get(['users', 1])).toEqual({ id: 1 });

    // onError called for the corrupt entry
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][1]).toEqual(['settings']);
  });

  it('calls onError and continues when getItem rejects', async () => {
    const qc = createQuery();
    const onError = vi.fn();
    const failStorage: PersistStorage = {
      getItem: () => Promise.reject(new Error('read error')),
      setItem: () => {},
    };

    await hydrateQueryCache(qc, { keys: [['users', 1]], onError, storage: failStorage });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError for structurally malformed entries (missing updatedAt)', async () => {
    const qc = createQuery();
    const onError = vi.fn();
    const storage = makeStorage({
      // Parses as valid JSON but has no `updatedAt` field
      'courier:["users",1]': JSON.stringify({ data: { id: 1 } }),
    });

    await hydrateQueryCache(qc, { keys: [['users', 1]], onError, storage });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toMatch(/Malformed/i);
    // Entry must NOT be written to the cache
    expect(qc.get(['users', 1])).toBeUndefined();
  });

  it('calls onError for structurally malformed entries (missing data)', async () => {
    const qc = createQuery();
    const onError = vi.fn();
    const storage = makeStorage({
      'courier:["users",1]': JSON.stringify({ updatedAt: Date.now() }),
    });

    await hydrateQueryCache(qc, { keys: [['users', 1]], onError, storage });

    // `data` is technically present (undefined) but `updatedAt` is a number, so
    // validation passes — confirm it proceeds without calling onError here
    // (the serialised JSON actually has no `data` key, so `parsed.data` is undefined,
    //  but `'data' in parsed` is false, triggering the malformed path).
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError for entries that are not objects (e.g. stored as a plain string)', async () => {
    const qc = createQuery();
    const onError = vi.fn();
    const storage = makeStorage({
      'courier:["users",1]': JSON.stringify('just a string'),
    });

    await hydrateQueryCache(qc, { keys: [['users', 1]], onError, storage });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('skips entries older than maxAge', async () => {
    const qc = createQuery();
    const ancient = Date.now() - 60_000; // 60 s old
    const storage = makeStorage({
      'courier:["settings"]': JSON.stringify({ data: { theme: 'dark' }, updatedAt: Date.now() }),
      'courier:["users",1]': JSON.stringify({ data: { id: 1 }, updatedAt: ancient }),
    });

    await hydrateQueryCache(qc, {
      keys: [['users', 1], ['settings']],
      maxAge: 30_000, // only accept entries younger than 30 s
      storage,
    });

    // Ancient entry must be skipped
    expect(qc.get(['users', 1])).toBeUndefined();
    // Recent entry must be hydrated
    expect(qc.get(['settings'])).toEqual({ theme: 'dark' });
  });

  it('hydrates all entries when maxAge is not set', async () => {
    const qc = createQuery();
    const ancient = Date.now() - 999_999;
    const storage = makeStorage({
      'courier:["users",1]': JSON.stringify({ data: { id: 1 }, updatedAt: ancient }),
    });

    await hydrateQueryCache(qc, { keys: [['users', 1]], storage });

    expect(qc.get(['users', 1])).toEqual({ id: 1 });
  });
});

// ---------------------------------------------------------------------------
// Round-trip: persist + hydrate
// ---------------------------------------------------------------------------

describe('persistQueryCache + hydrateQueryCache round-trip', () => {
  it('survives a page-load cycle', async () => {
    const qc1 = createQuery({ staleTime: 60_000 });
    const storage = makeStorage();
    const key = ['products', 42] as const;

    const stop = persistQueryCache(qc1, { keys: [key], storage });

    qc1.set(key, { price: 99 });
    stop();

    // Simulate fresh page load
    const qc2 = createQuery({ staleTime: 60_000 });

    await hydrateQueryCache(qc2, { keys: [key], storage });

    expect(qc2.get(key)).toEqual({ price: 99 });
    expect(qc2.getState(key)?.status).toBe('success');
  });

  it('hydrated updatedAt is restored so staleTime checks are accurate', async () => {
    vi.useFakeTimers();

    const storage = makeStorage();
    const key = ['data'] as const;
    let fetchCalls = 0;
    const fn = async () => ({ v: ++fetchCalls });

    // Page 1: fetch and persist with staleTime of 60 s
    const qc1 = createQuery({ staleTime: 60_000 });
    const stop = persistQueryCache(qc1, { keys: [key], storage });

    await qc1.fetch({ fn, key, staleTime: 60_000 });
    stop();

    // Advance 55 s — entry is still within staleTime
    vi.advanceTimersByTime(55_000);

    // Page 2: hydrate then fetch; should NOT trigger a network call because
    // the restored updatedAt places the entry within staleTime.
    const qc2 = createQuery({ staleTime: 60_000 });

    await hydrateQueryCache(qc2, { keys: [key], storage });
    await qc2.fetch({ fn, key, staleTime: 60_000 });

    // Still only 1 fetch — staleTime was respected
    expect(fetchCalls).toBe(1);

    // Advance another 10 s to cross the 60 s threshold
    vi.advanceTimersByTime(10_000);

    await qc2.fetch({ fn, key, staleTime: 60_000 });

    // Now stale — a new fetch must have fired
    expect(fetchCalls).toBe(2);

    vi.useRealTimers();
  });

  it('hydrates multiple keys in parallel (all succeed even with async storage)', async () => {
    let resolveAll!: () => void;
    const ready = new Promise<void>((res) => (resolveAll = res));

    let callCount = 0;

    const asyncStorage: PersistStorage & { store: Record<string, string> } = {
      async getItem(key) {
        callCount++;
        // Simulate a brief async delay (all run concurrently)
        await ready;

        return asyncStorage.store[key] ?? null;
      },
      setItem() {},
      store: {
        'courier:["a"]': JSON.stringify({ data: 'val-a', updatedAt: Date.now() }),
        'courier:["b"]': JSON.stringify({ data: 'val-b', updatedAt: Date.now() }),
        'courier:["c"]': JSON.stringify({ data: 'val-c', updatedAt: Date.now() }),
      },
    };

    const qc = createQuery();
    const hydratePromise = hydrateQueryCache(qc, {
      keys: [['a'], ['b'], ['c']],
      storage: asyncStorage,
    });

    // All three getItem calls should have been started before any resolves
    // (parallel) — if sequential, callCount would be 1 here, not 3.
    expect(callCount).toBe(3);

    resolveAll();
    await hydratePromise;

    expect(qc.get(['a'])).toBe('val-a');
    expect(qc.get(['b'])).toBe('val-b');
    expect(qc.get(['c'])).toBe('val-c');
  });
});
