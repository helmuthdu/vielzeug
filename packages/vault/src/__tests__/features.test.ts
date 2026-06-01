/**
 * Tests for features added in the "future improvements" pass:
 *   - signals (ReactiveSignal plugin)
 *   - watch() AsyncIterable
 *   - getMany()
 *   - pruneExpired() + scheduleExpiredPrune
 *   - onQuotaExceeded hook (WebStorage)
 *   - keys() and entries() (F2)
 */

import type { ReactiveSignal } from '../index';

import {
  createLocalStorage,
  createMemory,
  createSessionStorage,
  scheduleExpiredPrune,
  table,
  ttl,
  VaultError,
} from '../index';

type User = { id: number; name: string };
type Post = { id: number; title: string };

const schema = {
  posts: table<Post>('id'),
  users: table<User>('id'),
};

/** Flush pending observer microtasks. One tick is sufficient since the memory adapter's
 *  getAll() is synchronous — the .then() callback fires as a single microtask. */
const flushMicrotasks = () => Promise.resolve();

/* -------------------- ReactiveSignal plugin -------------------- */

describe('signals plugin (ReactiveSignal)', () => {
  test('signal is updated immediately when adapter is created', async () => {
    let latest: User[] = [{ id: 99, name: 'Seed' }];
    const usersSignal: ReactiveSignal<User[]> = {
      update: (fn) => {
        latest = fn(latest);
      },
    };

    const db = createMemory({ schema, signals: { users: usersSignal } });

    // signals are wired with immediate:true — fires on construction with empty array
    await flushMicrotasks();
    expect(latest).toEqual([]);

    await db.put('users', { id: 1, name: 'Alice' });
    await flushMicrotasks();

    expect(latest).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('signal is NOT updated for tables it is not registered on', async () => {
    let postUpdates = 0;
    const postsSignal: ReactiveSignal<Post[]> = {
      update: () => {
        postUpdates += 1;
      },
    };

    const db = createMemory({ schema, signals: { posts: postsSignal } });

    await flushMicrotasks(); // initial fire

    postUpdates = 0;
    await db.put('users', { id: 1, name: 'Alice' }); // users mutation
    await flushMicrotasks();

    expect(postUpdates).toBe(0); // posts signal not touched
  });

  test('ripple-shaped signal satisfies ReactiveSignal structurally', () => {
    // Simulates a ripple Signal<User[]>: has update(fn) among other methods
    const noop = () => {};
    const stateitLike = {
      peek: () => [] as User[],
      subscribe: () => Object.assign(noop, { dispose: noop, [Symbol.dispose]: noop }),
      update: (fn: (current: User[]) => User[]) => {
        void fn([]);
      },
      get value() {
        return [] as User[];
      },
      set value(_v: User[]) {},
    };

    // Type-check: stateitLike should satisfy ReactiveSignal<User[]>
    const _signal: ReactiveSignal<User[]> = stateitLike;

    expect(typeof _signal.update).toBe('function');
  });

  test('signal is cleaned up on dispose (no further updates after dispose)', async () => {
    let callCount = 0;
    const sig: ReactiveSignal<User[]> = {
      update: () => {
        callCount += 1;
      },
    };
    const db = createMemory({ schema, signals: { users: sig } });

    await flushMicrotasks(); // initial

    const countBeforeDispose = callCount;

    db.dispose();
    await db.put('users', { id: 1, name: 'Alice' }).catch(() => {}); // may throw after dispose
    await flushMicrotasks();

    expect(callCount).toBe(countBeforeDispose);
  });
});

/* -------------------- watch() -------------------- */

describe('watch()', () => {
  test('yields immediate snapshot then subsequent mutations', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const snapshots: User[][] = [];
    const iter = db.watch('users')[Symbol.asyncIterator]();

    // First yield: immediate snapshot
    const first = await iter.next();

    snapshots.push(first.value);

    // Trigger a mutation while we wait for the next yield
    const nextPromise = iter.next();

    await db.put('users', { id: 2, name: 'Bob' });

    const second = await nextPromise;

    snapshots.push(second.value);

    expect(snapshots[0]).toEqual([{ id: 1, name: 'Alice' }]);
    expect(snapshots[1]).toHaveLength(2);

    await iter.return?.();
  });

  test('stops iterating after return() is called', async () => {
    const db = createMemory({ schema });
    const iter = db.watch('users')[Symbol.asyncIterator]();

    // Consume the immediate snapshot
    await iter.next();

    // Return early
    const done = await iter.return!();

    expect(done.done).toBe(true);

    // No more yields expected — no timeout needed
  });

  test('when multiple mutations arrive before next() is consumed, returns only the latest snapshot', async () => {
    const db = createMemory({ schema });
    const iter = db.watch('users')[Symbol.asyncIterator]();

    // consume immediate empty snapshot
    await iter.next();

    // Fire two mutations before consuming — observer fires for each
    await db.put('users', { id: 1, name: 'A' });
    await flushMicrotasks(); // flush notification

    await db.put('users', { id: 2, name: 'B' });
    await flushMicrotasks(); // flush notification

    // Consumer was not calling next() during those mutations.
    // Only the LATEST snapshot should be pending — watch() uses latest-only semantics
    // to avoid building up stale intermediate states.
    const result = await iter.next();

    expect(result.done).toBe(false);
    expect(result.value).toHaveLength(2); // both users exist in the latest snapshot

    // No more pending snapshots — next call waits for a new mutation
    let resolved = false;
    const pending = iter.next().then(() => {
      resolved = true;
    });

    // Two microtask ticks are enough to confirm no spurious yield is pending
    await flushMicrotasks();
    await flushMicrotasks();
    expect(resolved).toBe(false); // correctly waiting, not returning stale data

    await iter.return?.();
    await pending.catch(() => {}); // clean up the dangling promise
  });

  test('iterator implements throw() for proper async generator protocol', async () => {
    const db = createMemory({ schema });
    const iter = db.watch('users')[Symbol.asyncIterator]();

    // consume initial snapshot
    await iter.next();

    // throw() should reject and clean up
    await expect(iter.throw!(new Error('test error'))).rejects.toThrow('test error');

    // After throw(), further next() calls return done
    const after = await iter.next();

    expect(after.done).toBe(true);
  });

  test('abandoned watch() does not register an observer until next() is called (no leak)', async () => {
    const db = createMemory({ schema });

    // Put a record BEFORE creating the iterable
    await db.put('users', { id: 1, name: 'Alice' });

    // Create the iterable but do NOT call next() yet — lazy registration means no observer is wired
    const stream = db.watch('users');

    // Another mutation fires; since no observer is registered, no pending snapshot accumulates
    await db.put('users', { id: 2, name: 'Bob' });
    await flushMicrotasks();

    // Now call next() for the first time — observer is registered here and the current snapshot is fetched
    const iter = stream[Symbol.asyncIterator]();
    const first = await iter.next();

    // Should see both users (current state at time of first next() call)
    expect(first.value).toHaveLength(2);

    await iter.return?.();
  });
});

/* -------------------- getMany() -------------------- */

describe('getMany()', () => {
  test('returns records in key order with undefined for missing keys', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });
    await db.put('users', { id: 3, name: 'Charlie' });

    const results = await db.getMany('users', [3, 99, 1]);

    expect(results).toEqual([{ id: 3, name: 'Charlie' }, undefined, { id: 1, name: 'Alice' }]);
  });

  test('returns empty array for empty keys input', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.getMany('users', [])).toEqual([]);
  });

  test('getMany inside batch scope resolves in key order', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });
    await db.put('users', { id: 2, name: 'Bob' });

    const result = await db.batch(['users'] as const, async (tx) => {
      return tx.getMany('users', [2, 1]);
    });

    expect(result).toEqual([
      { id: 2, name: 'Bob' },
      { id: 1, name: 'Alice' },
    ]);
  });

  test('getMany inside batch rejects out-of-scope table', async () => {
    const db = createMemory({ schema });

    await expect(
      db.batch(['users'] as const, async (tx) => {
        return (tx as any).getMany('posts', [1]);
      }),
    ).rejects.toThrow('batch scope');
  });
});

/* -------------------- pruneExpired() + scheduleExpiredPrune -------------------- */

describe('pruneExpired()', () => {
  test('returns zero when no TTL records are present', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const result = await db.pruneExpired();

    expect(result.users).toBe(0);
    expect(result.posts).toBe(0);
  });

  test('returns count of expired records removed', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await db.put('users', { id: 2, name: 'Bob' }, ttl.ms(1000));
    await db.put('users', { id: 3, name: 'Charlie' }); // no TTL → never expires

    // Advance time past TTL
    vi.advanceTimersByTime(2000);

    const result = await db.pruneExpired();

    expect(result.users).toBe(2);

    // Live record still accessible
    expect(await db.get('users', 3)).toEqual({ id: 3, name: 'Charlie' });

    vi.useRealTimers();
  });
});

describe('scheduleExpiredPrune()', () => {
  test('calls pruneExpired() on each interval tick', async () => {
    vi.useFakeTimers();

    const pruneResults: unknown[] = [];
    const fakeAdapter = {
      pruneExpired: async () => {
        pruneResults.push(true);

        return { posts: 0, users: 0 };
      },
    };

    const stop = scheduleExpiredPrune(fakeAdapter, { interval: 5000 });

    expect(pruneResults).toHaveLength(0);

    vi.advanceTimersByTime(5000);
    await Promise.resolve(); // flush microtasks
    expect(pruneResults).toHaveLength(1);

    vi.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(pruneResults).toHaveLength(2);

    stop();
    vi.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(pruneResults).toHaveLength(2); // no more calls after stop

    vi.useRealTimers();
  });
});

/* -------------------- onQuotaExceeded (WebStorage) -------------------- */

describe('onQuotaExceeded (WebStorage)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test('throws by default when quota is exceeded', async () => {
    // jsdom's localStorage is a Proxy — spy on Storage.prototype so the intercept
    // applies to the underlying method lookup rather than the proxy's own property.
    // Note: this patches all Storage instances (localStorage + sessionStorage);
    // vi.restoreAllMocks() in afterEach restores the prototype before the next test.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const db = createLocalStorage({ name: 'test-quota', schema });

    await expect(db.put('users', { id: 1, name: 'Alice' })).rejects.toThrow('quota exceeded');
  });

  test('ignores write when onQuotaExceeded returns "ignore"', async () => {
    let exceeded = false;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const db = createLocalStorage({
      name: 'test-quota-ignore',
      onQuotaExceeded: (_table, _err) => {
        exceeded = true;

        return 'ignore';
      },
      schema,
    });

    await expect(db.put('users', { id: 1, name: 'Alice' })).resolves.toBeUndefined();
    expect(exceeded).toBe(true);
  });
});

/* -------------------- keys() and entries() (F2) -------------------- */

describe('keys()', () => {
  test('returns primary key of each live record', async () => {
    const db = createMemory({ schema });

    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const keys = await db.keys('users');

    expect(keys).toHaveLength(2);
    expect(keys).toContain(1);
    expect(keys).toContain(2);
  });

  test('returns empty array when table is empty', async () => {
    const db = createMemory({ schema });

    expect(await db.keys('users')).toEqual([]);
  });

  test('keys() inside batch transaction', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 42, name: 'Charlie' });

    const result = await db.batch(['users'], async (tx) => tx.keys('users'));

    expect(result).toEqual([42]);
  });
});

describe('entries()', () => {
  test('returns [key, record] pairs for each live record', async () => {
    const db = createMemory({ schema });
    const alice = { id: 1, name: 'Alice' };
    const bob = { id: 2, name: 'Bob' };

    await db.putAll('users', [alice, bob]);

    const entries = await db.entries('users');

    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual([1, alice]);
    expect(entries).toContainEqual([2, bob]);
  });

  test('returns empty array when table is empty', async () => {
    const db = createMemory({ schema });

    expect(await db.entries('users')).toEqual([]);
  });

  test('entries() inside batch transaction', async () => {
    const db = createMemory({ schema });
    const user = { id: 7, name: 'Dave' };

    await db.put('users', user);

    const result = await db.batch(['users'], async (tx) => tx.entries('users'));

    expect(result).toEqual([[7, user]]);
  });
});

/* -------------------- watchStream() -------------------- */

describe('watchStream()', () => {
  test('emits initial snapshot immediately', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const stream = db.watchStream('users');
    const reader = stream.getReader();
    const { value } = await reader.read();

    expect(value).toEqual([{ id: 1, name: 'Alice' }]);

    await reader.cancel();
  });

  test('emits subsequent mutations', async () => {
    const db = createMemory({ schema });
    const stream = db.watchStream('users');
    const reader = stream.getReader();

    // consume initial empty snapshot
    await reader.read();

    const nextP = reader.read();

    await db.put('users', { id: 1, name: 'Alice' });
    await flushMicrotasks();

    const { value } = await nextP;

    expect(value).toEqual([{ id: 1, name: 'Alice' }]);

    await reader.cancel();
  });

  test('cancel() stops the observer — no more chunks enqueued', async () => {
    const db = createMemory({ schema });
    const stream = db.watchStream('users');
    const reader = stream.getReader();

    // consume initial snapshot
    await reader.read();
    // cancel the stream — observer should be stopped
    await reader.cancel();

    // A mutation after cancel should not be reachable through this stream.
    // We verify by ensuring the stream is done (read returns done).
    const { done } = await reader.read().catch(() => ({ done: true, value: undefined }));

    expect(done).toBe(true);
  });

  test('AbortSignal cancels the stream', async () => {
    const db = createMemory({ schema });
    const controller = new AbortController();
    const stream = db.watchStream('users', { signal: controller.signal });
    const reader = stream.getReader();

    // consume initial snapshot
    await reader.read();

    // abort the signal — stream should close
    controller.abort();

    // next read should return done (stream closed by signal handler)
    const result = await reader.read();

    expect(result.done).toBe(true);
  });

  test('mode: latest — holds only most recent snapshot when consumer lags', async () => {
    const db = createMemory({ schema });
    const stream = db.watchStream('users', { mode: 'latest' });
    const reader = stream.getReader();

    // consume initial empty snapshot to start
    await reader.read();

    // fire two mutations without consuming
    await db.put('users', { id: 1, name: 'First' });
    await flushMicrotasks();
    await db.put('users', { id: 2, name: 'Second' });
    await flushMicrotasks();

    // consumer reads: should get the latest (both users) snapshot
    const { value } = await reader.read();

    expect(value).toHaveLength(2);

    await reader.cancel();
  });

  test('mode: all — queues every snapshot', async () => {
    const db = createMemory({ schema });
    const stream = db.watchStream('users', { mode: 'all' });
    const reader = stream.getReader();

    // initial snapshot
    await reader.read();

    // two mutations
    await db.put('users', { id: 1, name: 'First' });
    await flushMicrotasks();
    await db.put('users', { id: 2, name: 'Second' });
    await flushMicrotasks();

    // Both snapshots should be in the stream's queue
    const snap1 = await reader.read();
    const snap2 = await reader.read();

    expect(snap1.value).toHaveLength(1); // only First
    expect(snap2.value).toHaveLength(2); // First + Second

    await reader.cancel();
  });
});

/* -------------------- AbortSignal on observe / observeMany / watch -------------------- */

describe('AbortSignal cancellation', () => {
  test('observe() — signal abort unsubscribes listener', async () => {
    const db = createMemory({ schema });
    const controller = new AbortController();
    const calls: User[][] = [];

    db.observe('users', (records) => calls.push(records), { signal: controller.signal });
    await flushMicrotasks(); // initial snapshot

    calls.length = 0; // reset

    controller.abort(); // unsubscribe

    await db.put('users', { id: 1, name: 'Alice' });
    await flushMicrotasks();

    expect(calls).toHaveLength(0); // no further calls after abort
  });

  test('observeMany() — signal abort unsubscribes all listeners', async () => {
    const db = createMemory({ schema });
    const controller = new AbortController();
    const calls: unknown[] = [];

    db.observeMany(['users', 'posts'] as const, (snaps) => calls.push(snaps), {
      signal: controller.signal,
    });
    await flushMicrotasks(); // initial combined snapshot

    calls.length = 0; // reset

    controller.abort(); // unsubscribe all

    await db.put('users', { id: 1, name: 'Alice' });
    await flushMicrotasks();

    expect(calls).toHaveLength(0); // no further calls
  });

  test('watch() — signal abort terminates the async iterator', async () => {
    const db = createMemory({ schema });
    const controller = new AbortController();
    const iter = db.watch('users', { signal: controller.signal })[Symbol.asyncIterator]();

    // consume initial snapshot
    await iter.next();

    // abort from outside
    controller.abort();

    // the iterator should now be done
    const result = await iter.next();

    expect(result.done).toBe(true);
  });
});

/* -------------------- pruneExpired() with table filter -------------------- */

describe('pruneExpired() with table filter', () => {
  test('only prunes the specified table', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await db.put('posts', { id: 1, title: 'Hello' }, ttl.ms(1000));

    vi.advanceTimersByTime(2000);

    // Prune only users
    const result = await db.pruneExpired(['users']);

    expect(result.users).toBe(1);

    // posts should not have been pruned by this call — but memory adapter
    // performs lazy eviction on get, so check raw count via debug()
    // We can verify by calling pruneExpired() for posts separately:
    const result2 = await db.pruneExpired(['posts']);

    expect(result2.posts).toBe(1);

    vi.useRealTimers();
  });

  test('pruneExpired() with no filter prunes all tables', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await db.put('posts', { id: 1, title: 'Hello' }, ttl.ms(1000));

    vi.advanceTimersByTime(2000);

    const result = await db.pruneExpired();

    expect(result.users).toBe(1);
    expect(result.posts).toBe(1);

    vi.useRealTimers();
  });
});

/* -------------------- top-level getOrDefault() -------------------- */

describe('top-level getOrDefault()', () => {
  test('returns existing record without calling defaultFn', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    let called = false;
    const result = await db.getOrDefault('users', 1, () => {
      called = true;

      return { id: 1, name: 'Fallback' };
    });

    expect(result).toEqual({ id: 1, name: 'Alice' });
    expect(called).toBe(false);
  });

  test('inserts and returns defaultFn result when key is absent', async () => {
    const db = createMemory({ schema });

    const result = await db.getOrDefault('users', 42, () => ({ id: 42, name: 'Default' }));

    expect(result).toEqual({ id: 42, name: 'Default' });

    // Should now be persisted
    expect(await db.get('users', 42)).toEqual({ id: 42, name: 'Default' });
  });

  test('can be called outside batch() — works at the adapter level', async () => {
    const db = createMemory({ schema });

    // Calling directly on db (not inside batch) must not throw
    await expect(db.getOrDefault('users', 1, () => ({ id: 1, name: 'Direct' }))).resolves.toEqual({
      id: 1,
      name: 'Direct',
    });
  });
});

/* -------------------- getOrDefault key-mismatch -------------------- */

describe('getOrDefault — key verification', () => {
  test('throws when defaultFn returns a record with mismatched key', async () => {
    const db = createMemory({ schema });

    await expect(db.getOrDefault('users', 42, () => ({ id: 99, name: 'Wrong key' }))).rejects.toThrow(
      'key field "id" must be "42"',
    );
  });

  test('throws inside batch when defaultFn key is wrong', async () => {
    const db = createMemory({ schema });

    await expect(
      db.batch(['users'], async (tx) => tx.getOrDefault('users', 1, () => ({ id: 2, name: 'Bad' }))),
    ).rejects.toThrow('key field "id" must be "1"');
  });
});

/* -------------------- Custom VaultCodec -------------------- */

describe('custom VaultCodec', () => {
  test('encode/decode cycle with compact codec works for put/get', async () => {
    const compactCodec = {
      decode: <T>(raw: unknown) => {
        if (typeof raw !== 'object' || raw === null || !('v' in raw)) return undefined;

        const { e, v } = raw as { e?: unknown; v: unknown };

        return { expiresAt: typeof e === 'number' ? e : undefined, value: v as T };
      },
      encode: <T>(value: T, expiresAt?: number) =>
        expiresAt !== undefined ? { e: expiresAt, v: value } : { v: value },
    };

    const db = createMemory({ codec: compactCodec, schema });

    await db.put('users', { id: 1, name: 'Alice' });
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.getAll('users')).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('TTL works with custom codec', async () => {
    vi.useFakeTimers();

    const compactCodec = {
      decode: <T>(raw: unknown) => {
        if (typeof raw !== 'object' || raw === null || !('v' in raw)) return undefined;

        const { e, v } = raw as { e?: unknown; v: unknown };

        return { expiresAt: typeof e === 'number' ? e : undefined, value: v as T };
      },
      encode: <T>(value: T, expiresAt?: number) =>
        expiresAt !== undefined ? { e: expiresAt, v: value } : { v: value },
    };

    const db = createMemory({ codec: compactCodec, schema });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });

    vi.advanceTimersByTime(2000);
    expect(await db.get('users', 1)).toBeUndefined();

    vi.useRealTimers();
  });

  test('codec that returns undefined for decode treats data as corrupt/missing', async () => {
    const brokenCodec = {
      decode: () => undefined,
      encode: <T>(value: T) => ({ value }),
    };

    const db = createMemory({ codec: brokenCodec, schema });

    await db.put('users', { id: 1, name: 'Alice' });
    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.getAll('users')).toEqual([]);
  });
});

/* -------------------- scheduleExpiredPrune auto-stop on dispose -------------------- */

describe('scheduleExpiredPrune — auto-stop on VaultDisposedError', () => {
  test('stops the interval automatically when pruneExpired throws VaultDisposedError', async () => {
    vi.useFakeTimers();

    const { VaultDisposedError } = await import('../index');

    let callCount = 0;

    const fakeAdapter = {
      pruneExpired: async () => {
        callCount += 1;

        if (callCount >= 2) throw new VaultDisposedError();

        return { posts: 0, users: 0 };
      },
    };

    scheduleExpiredPrune(fakeAdapter, { interval: 1000 });

    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(callCount).toBe(1); // first tick: succeeds

    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(callCount).toBe(2); // second tick: throws VaultDisposedError → interval cleared

    vi.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(callCount).toBe(2); // no more ticks — auto-stopped

    vi.useRealTimers();
  });
});

/* -------------------- isEmpty() -------------------- */

describe('isEmpty()', () => {
  test('returns true for an empty table', async () => {
    const db = createMemory({ schema });

    expect(await db.isEmpty('users')).toBe(true);
  });

  test('returns false when table has records', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.isEmpty('users')).toBe(false);
  });

  test('returns true after all records are deleted', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });
    await db.delete('users', 1);

    expect(await db.isEmpty('users')).toBe(true);
  });

  test('returns true after clear()', async () => {
    const db = createMemory({ schema });

    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await db.clear('users');

    expect(await db.isEmpty('users')).toBe(true);
  });

  test('works inside batch() transaction', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const result = await db.batch(['users'], async (tx) => tx.isEmpty('users'));

    expect(result).toBe(false);
  });

  test('returns true when all records are TTL-expired', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(500));

    vi.advanceTimersByTime(1000);

    expect(await db.isEmpty('users')).toBe(true);

    vi.useRealTimers();
  });
});

/* -------------------- WebStorage construction failure -------------------- */

describe('WebStorage construction failure', () => {
  test('createLocalStorage throws VaultError when storage is unavailable', () => {
    expect(() => createLocalStorage({ name: 'test', schema })).not.toThrow(); // sanity: normal creation succeeds in jsdom

    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Access denied', 'SecurityError');
      },
    });

    try {
      expect(() => createLocalStorage({ name: 'test', schema })).toThrow(VaultError);
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor);
      }
    }
  });

  test('createSessionStorage throws VaultError when storage is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Access denied', 'SecurityError');
      },
    });

    try {
      expect(() => createSessionStorage({ name: 'test', schema })).toThrow(VaultError);
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'sessionStorage', descriptor);
      }
    }
  });
});
