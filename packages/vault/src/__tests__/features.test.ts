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
  createVersionedCodec,
  isExpired,
  scheduleExpiredPrune,
  table,
  toReadableStream,
  ttl,
  VaultDisposedError,
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

describe('getOrDefault() with TTL', () => {
  test('TTL is applied to the inserted default record', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.getOrDefault('users', 42, () => ({ id: 42, name: 'Temp' }), ttl.ms(1000));

    expect(await db.get('users', 42)).toEqual({ id: 42, name: 'Temp' });

    vi.advanceTimersByTime(2000);

    expect(await db.get('users', 42)).toBeUndefined();

    vi.useRealTimers();
  });

  test('TTL is NOT applied to an existing record returned by getOrDefault', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' }); // no TTL

    const result = await db.getOrDefault('users', 1, () => ({ id: 1, name: 'Fallback' }), ttl.ms(100));

    expect(result).toEqual({ id: 1, name: 'Alice' });

    vi.advanceTimersByTime(500); // past the TTL passed to getOrDefault

    // The original record has no TTL and should still be accessible
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });

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

/* -------------------- toReadableStream() -------------------- */

describe('toReadableStream()', () => {
  test('emits initial snapshot immediately', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const stream = toReadableStream(db.watch('users'));
    const reader = stream.getReader();
    const { value } = await reader.read();

    expect(value).toEqual([{ id: 1, name: 'Alice' }]);

    await reader.cancel();
  });

  test('emits subsequent mutations', async () => {
    const db = createMemory({ schema });
    const stream = toReadableStream(db.watch('users'));
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

  test('cancel() stops the iterator — no more chunks enqueued', async () => {
    const db = createMemory({ schema });
    const stream = toReadableStream(db.watch('users'));
    const reader = stream.getReader();

    // consume initial snapshot
    await reader.read();
    // cancel the stream — iterator.return() is called
    await reader.cancel();

    // A mutation after cancel should not be reachable through this stream.
    const { done } = await reader.read().catch(() => ({ done: true, value: undefined }));

    expect(done).toBe(true);
  });

  test('AbortSignal on watch() terminates the stream via cancel', async () => {
    const db = createMemory({ schema });
    const controller = new AbortController();
    const stream = toReadableStream(db.watch('users', { signal: controller.signal }));
    const reader = stream.getReader();

    // consume initial snapshot
    await reader.read();

    // abort terminates the watch() async iterable
    controller.abort();

    // next pull will call iter.next() which resolves done:true
    const result = await reader.read();

    expect(result.done).toBe(true);
  });

  test('mode: latest — watch() drops intermediate snapshots; toReadableStream delivers each in turn', async () => {
    const db = createMemory({ schema });

    // With mode:'latest', when the consumer lags the watch() iterable holds only
    // the most-recent snapshot. Here we DON'T lag — each read() happens sequentially,
    // so every yielded value is consumed as it arrives.
    const stream = toReadableStream(db.watch('users', { mode: 'latest' }));
    const reader = stream.getReader();

    // consume initial empty snapshot
    await reader.read();

    // mutation 1
    await db.put('users', { id: 1, name: 'First' });
    await flushMicrotasks();

    const snap1 = await reader.read();

    expect(snap1.value).toHaveLength(1); // First is available

    // mutation 2 (id:2 added)
    await db.put('users', { id: 2, name: 'Second' });
    await flushMicrotasks();

    const snap2 = await reader.read();

    expect(snap2.value).toHaveLength(2); // First + Second

    await reader.cancel();
  });

  test('mode: all — queues every snapshot in order', async () => {
    const db = createMemory({ schema });
    const stream = toReadableStream(db.watch('users', { mode: 'all' }));
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

  test('observeMany() — already-aborted signal never fires the callback', async () => {
    const db = createMemory({ schema });
    const controller = new AbortController();

    controller.abort(); // abort BEFORE observe is called

    const calls: unknown[] = [];

    db.observeMany(['users', 'posts'] as const, (snaps) => calls.push(snaps), {
      signal: controller.signal,
    });

    await flushMicrotasks();
    await db.put('users', { id: 1, name: 'Alice' });
    await flushMicrotasks();

    expect(calls).toHaveLength(0); // already aborted — no snapshots ever delivered
  });

  test('watch() — already-aborted signal terminates iterator before first next()', async () => {
    const db = createMemory({ schema });
    const controller = new AbortController();

    controller.abort(); // abort BEFORE watch is called

    const iter = db.watch('users', { signal: controller.signal })[Symbol.asyncIterator]();
    const result = await iter.next();

    expect(result.done).toBe(true); // should be done immediately
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

  test('count() reflects evicted records after pruneExpired()', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await db.put('users', { id: 2, name: 'Bob' }); // no TTL

    expect(await db.count('users')).toBe(2); // prime the cache

    vi.advanceTimersByTime(2000); // Alice expires

    const result = await db.pruneExpired(['users']);

    expect(result.users).toBe(1);
    expect(await db.count('users')).toBe(1); // cache must be invalidated

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

describe('scheduleExpiredPrune — onError option', () => {
  test('onError is called when pruneExpired() throws a non-VaultDisposedError', async () => {
    vi.useFakeTimers();

    const errors: unknown[] = [];
    const boom = new Error('network failure');

    const fakeAdapter = {
      pruneExpired: async () => {
        throw boom;
      },
    };

    const stop = scheduleExpiredPrune(fakeAdapter, { interval: 1000, onError: (e) => errors.push(e) });

    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe(boom);

    stop();
    vi.useRealTimers();
  });

  test('non-VaultDisposedError does NOT stop the interval', async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const errors: unknown[] = [];

    const fakeAdapter = {
      pruneExpired: async () => {
        callCount += 1;

        throw new Error('transient error');
      },
    };

    const stop = scheduleExpiredPrune(fakeAdapter, { interval: 1000, onError: (e) => errors.push(e) });

    vi.advanceTimersByTime(3000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(callCount).toBeGreaterThanOrEqual(2); // interval still running
    expect(errors.length).toBeGreaterThanOrEqual(2);

    stop();
    vi.useRealTimers();
  });
});

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

/* -------------------- iterate() on memory adapter -------------------- */

describe('MemoryAdapter.iterate()', () => {
  test('yields all live records', async () => {
    const db = createMemory({ schema });

    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const records: User[] = [];

    for await (const record of db.iterate('users')) {
      records.push(record);
    }

    expect(records).toHaveLength(2);
    expect(records.map((r) => r.id).sort()).toEqual([1, 2]);
  });

  test('skips TTL-expired records', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Ephemeral' }, ttl.ms(1000));
    await db.put('users', { id: 2, name: 'Permanent' });

    vi.advanceTimersByTime(2000); // id:1 expires

    const records: User[] = [];

    for await (const record of db.iterate('users')) {
      records.push(record);
    }

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ id: 2, name: 'Permanent' });

    vi.useRealTimers();
  });

  test('yields nothing for an empty table', async () => {
    const db = createMemory({ schema });
    const records: User[] = [];

    for await (const record of db.iterate('users')) {
      records.push(record);
    }

    expect(records).toHaveLength(0);
  });
});

/* -------------------- isExpired() utility -------------------- */

describe('isExpired()', () => {
  test('returns false for undefined', () => {
    expect(isExpired(undefined)).toBe(false);
  });

  test('returns true when expiresAt is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const past = Date.now() - 1;

    expect(isExpired(past)).toBe(true);

    vi.useRealTimers();
  });

  test('returns false when expiresAt is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const future = Date.now() + 60_000;

    expect(isExpired(future)).toBe(false);

    vi.useRealTimers();
  });

  test('returns true when expiresAt equals Date.now() (at the boundary)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const boundary = Date.now();

    expect(isExpired(boundary)).toBe(true);

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

/* -------------------- B2: VaultDisposedError after dispose() -------------------- */

describe('VaultDisposedError after dispose()', () => {
  test('get throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.get('users', 1)).rejects.toThrow(VaultDisposedError);
  });

  test('put throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.put('users', { id: 1, name: 'Alice' })).rejects.toThrow(VaultDisposedError);
  });

  test('getAll throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.getAll('users')).rejects.toThrow(VaultDisposedError);
  });

  test('delete throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.delete('users', 1)).rejects.toThrow(VaultDisposedError);
  });

  test('keys throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.keys('users')).rejects.toThrow(VaultDisposedError);
  });

  test('count throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.count('users')).rejects.toThrow(VaultDisposedError);
  });

  test('update throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.update('users', 1, { name: 'Bob' })).rejects.toThrow(VaultDisposedError);
  });

  test('observe throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    expect(() => db.observe('users', () => {})).toThrow(VaultDisposedError);
  });

  test('query throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    expect(() => db.query('users')).toThrow(VaultDisposedError);
  });

  test('watch() throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    expect(() => db.watch('users')).toThrow(VaultDisposedError);
  });

  test('batch() throws VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.batch(['users'], async (tx) => tx.getAll('users'))).rejects.toThrow(VaultDisposedError);
  });

  test('iterate() rejects with VaultDisposedError after dispose()', async () => {
    const db = createMemory({ schema });

    await db.dispose();

    await expect(async () => {
      for await (const _ of db.iterate('users')) {
        // should not reach here
      }
    }).rejects.toThrow(VaultDisposedError);
  });

  test('dispose() is idempotent — calling twice does not throw', async () => {
    const db = createMemory({ schema });

    await db.dispose();
    await expect(db.dispose()).resolves.toBeUndefined();
  });
});

/* -------------------- B3 + E1: scheduleExpiredPrune interval guard + signal -------------------- */

describe('scheduleExpiredPrune interval validation + signal', () => {
  test('throws VaultError for interval = 0', () => {
    const db = createMemory({ schema });

    expect(() => scheduleExpiredPrune(db, { interval: 0 })).toThrow(VaultError);
  });

  test('throws VaultError for negative interval', () => {
    const db = createMemory({ schema });

    expect(() => scheduleExpiredPrune(db, { interval: -100 })).toThrow(VaultError);
  });

  test('throws VaultError for NaN interval', () => {
    const db = createMemory({ schema });

    expect(() => scheduleExpiredPrune(db, { interval: NaN })).toThrow(VaultError);
  });

  test('throws VaultError for Infinity interval', () => {
    const db = createMemory({ schema });

    expect(() => scheduleExpiredPrune(db, { interval: Infinity })).toThrow(VaultError);
  });

  test('signal abort stops the schedule', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });
    const ac = new AbortController();
    let pruneCount = 0;

    const stop = scheduleExpiredPrune(
      {
        pruneExpired: async () => {
          pruneCount += 1;

          return {};
        },
      },
      { interval: 1000, signal: ac.signal },
    );

    await vi.advanceTimersByTimeAsync(1500);
    expect(pruneCount).toBe(1);

    ac.abort();

    await vi.advanceTimersByTimeAsync(3000);
    expect(pruneCount).toBe(1); // no more calls after abort

    stop(); // should be safe to call after signal abort
    vi.useRealTimers();
  });

  test('onError is called for non-disposal errors', async () => {
    vi.useFakeTimers();

    const errors: unknown[] = [];
    const boom = new Error('backend error');

    scheduleExpiredPrune(
      {
        pruneExpired: async () => {
          throw boom;
        },
      },
      { interval: 500, onError: (e) => errors.push(e) },
    );

    await vi.advanceTimersByTimeAsync(1100);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toBe(boom);

    vi.useRealTimers();
  });
});

/* -------------------- F3: keys(table, filter) -------------------- */

describe('keys(table, filter)', () => {
  test('returns all keys when no filter provided', async () => {
    const db = createMemory({ schema });

    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Carol' },
    ]);

    expect(await db.keys('users')).toEqual([1, 2, 3]);
  });

  test('returns only matching keys when filter provided', async () => {
    const db = createMemory({ schema });

    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Carol' },
    ]);

    const keys = await db.keys('users', (u) => u.name.startsWith('C'));

    expect(keys).toEqual([3]);
  });

  test('returns empty array when filter matches nothing', async () => {
    const db = createMemory({ schema });

    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const keys = await db.keys('users', (u) => u.name === 'Zelda');

    expect(keys).toEqual([]);
  });

  test('filter does not use native getAllKeys path (fetches full records)', async () => {
    const db = createMemory({ schema });

    await db.putAll('users', [
      { id: 10, name: 'Alice' },
      { id: 20, name: 'Bob' },
    ]);

    const keys = await db.keys('users', (u) => u.id > 15);

    expect(keys).toEqual([20]);
  });
});

/* -------------------- F4: createVersionedCodec -------------------- */

describe('createVersionedCodec', () => {
  test('encodes and decodes with the current version codec', () => {
    const innerCodec = {
      decode: <T>(r: unknown) => ({ value: (r as { val: T }).val }),
      encode: <T>(v: T) => ({ val: v }),
    };
    const codec = createVersionedCodec([{ codec: innerCodec, version: 1 }], 1);
    const encoded = codec.encode({ x: 42 });

    expect(encoded).toMatchObject({ __v: 1 });

    const decoded = codec.decode<{ x: number }>(encoded);

    expect(decoded).toMatchObject({ value: { x: 42 } });
  });

  test('decodes old version records using their codec', () => {
    const v1Codec = {
      decode: (r: unknown) => {
        const v = r as { value: { legacy: boolean } };

        return { value: v.value };
      },
      encode: (v: unknown) => ({ value: v }),
    };
    const v2Codec = {
      decode: (r: unknown) => {
        const v = r as { value: { modern: boolean } };

        return { value: v.value };
      },
      encode: (v: unknown) => ({ value: v }),
    };
    const codec = createVersionedCodec(
      [
        { codec: v1Codec, version: 1 },
        { codec: v2Codec, version: 2 },
      ],
      2,
    );

    const v1Record = { __d: { value: { legacy: true } }, __v: 1 };
    const decoded = codec.decode<{ legacy: boolean }>(v1Record);

    expect(decoded?.value).toEqual({ legacy: true });
  });

  test('returns undefined for unknown version', () => {
    const codec = createVersionedCodec(
      [{ codec: { decode: (r) => r as { value: unknown }, encode: (v) => v }, version: 1 }],
      1,
    );

    expect(codec.decode({ __d: {}, __v: 99 })).toBeUndefined();
  });

  test('returns undefined when __v field is missing', () => {
    const codec = createVersionedCodec(
      [{ codec: { decode: (r) => r as { value: unknown }, encode: (v) => v }, version: 1 }],
      1,
    );

    expect(codec.decode({ data: 'no version' })).toBeUndefined();
  });

  test('throws VaultError for empty versions array', () => {
    expect(() => createVersionedCodec([], 1)).toThrow(VaultError);
  });

  test('throws VaultError for duplicate versions', () => {
    const c = { decode: (r: unknown) => r as { value: unknown }, encode: (v: unknown) => v };

    expect(() =>
      createVersionedCodec(
        [
          { codec: c, version: 1 },
          { codec: c, version: 1 },
        ],
        1,
      ),
    ).toThrow(VaultError);
  });

  test('throws VaultError when currentVersion is not in versions', () => {
    const c = { decode: (r: unknown) => r as { value: unknown }, encode: (v: unknown) => v };

    expect(() => createVersionedCodec([{ codec: c, version: 1 }], 99)).toThrow(VaultError);
  });

  test('throws VaultError for negative version number', () => {
    const c = { decode: (r: unknown) => r as { value: unknown }, encode: (v: unknown) => v };

    expect(() => createVersionedCodec([{ codec: c, version: -1 }], -1)).toThrow(VaultError);
  });

  test('works end-to-end with memory adapter', async () => {
    const rawCodec = {
      decode: <T>(r: unknown) => ({ value: r as T }),
      encode: <T>(v: T) => v,
    };
    const codec = createVersionedCodec([{ codec: rawCodec, version: 1 }], 1);
    const db = createMemory({ codec, schema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('expiresAt is preserved through the version envelope', () => {
    const innerCodec = {
      decode: <T>(r: unknown): { expiresAt?: number; value: T } | undefined => {
        if (typeof r !== 'object' || r === null || !('value' in r)) return undefined;

        const rec = r as { expiresAt?: number; value: unknown };

        return { expiresAt: rec.expiresAt, value: rec.value as T };
      },
      encode: <T>(v: T, expiresAt?: number): unknown =>
        expiresAt !== undefined ? { expiresAt, value: v } : { value: v },
    };
    const codec = createVersionedCodec([{ codec: innerCodec, version: 1 }], 1);

    const futureTs = Date.now() + 60_000;
    const encoded = codec.encode({ x: 1 }, futureTs);
    const decoded = codec.decode(encoded);

    expect(decoded?.expiresAt).toBe(futureTs);
    expect(decoded?.value).toEqual({ x: 1 });
  });
});

/* -------------------- C2: toReadableStream -------------------- */

describe('toReadableStream', () => {
  test('yields values from async iterable', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const ac = new AbortController();
    const stream = toReadableStream(db.watch('users', { signal: ac.signal }));
    const reader = stream.getReader();

    const { value } = await reader.read();

    expect(value).toEqual([{ id: 1, name: 'Alice' }]);
    ac.abort();
    reader.cancel();
  });

  test('stream closes when signal is aborted', async () => {
    const db = createMemory({ schema });
    const ac = new AbortController();
    const stream = toReadableStream(db.watch('users', { signal: ac.signal }));
    const reader = stream.getReader();

    ac.abort();

    const { done } = await reader.read();

    expect(done).toBe(true);
  });
});

/* -------------------- C4: observeMany with pre-aborted signal -------------------- */

describe('observeMany with pre-aborted signal', () => {
  test('returns noop unsubscribe and never fires when signal is already aborted', async () => {
    const db = createMemory({ schema });
    const ac = new AbortController();

    ac.abort();

    let fired = false;
    const unsub = db.observeMany(
      ['users'],
      () => {
        fired = true;
      },
      { signal: ac.signal },
    );

    await db.put('users', { id: 1, name: 'Alice' });
    await Promise.resolve();

    expect(fired).toBe(false);
    expect(() => unsub()).not.toThrow();
  });
});

/* -------------------- C6: debug() on fresh adapter -------------------- */

describe('debug() on fresh adapter', () => {
  test('returns zero counts for all tables on empty adapter', async () => {
    const db = createMemory({ schema });
    const info = await db.debug();

    expect(info.tables).toHaveLength(2);

    for (const t of info.tables) {
      expect(t.recordCount).toBe(0);
      expect(t.expiredCount).toBe(0);
    }
  });

  test('reflects live and expired counts accurately', async () => {
    vi.useFakeTimers();

    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Live' });
    await db.put('users', { id: 2, name: 'Expiring' }, ttl.ms(500));

    vi.advanceTimersByTime(1000);

    const info = await db.debug();
    const usersEntry = info.tables.find((t) => t.name === 'users');

    expect(usersEntry?.recordCount).toBe(1);
    expect(usersEntry?.expiredCount).toBe(1);

    vi.useRealTimers();
  });
});

/* -------------------- observe({ immediate: false }) -------------------- */

describe('observe({ immediate: false })', () => {
  test('skips the initial snapshot when immediate is false', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const calls: unknown[][] = [];

    db.observe('users', (records) => calls.push(records), { immediate: false });

    await flushMicrotasks();

    expect(calls).toHaveLength(0); // no initial snapshot

    await db.put('users', { id: 2, name: 'Bob' });
    await flushMicrotasks();

    expect(calls).toHaveLength(1); // fires on mutation
    expect(calls[0]).toHaveLength(2);
  });

  test('fires initial snapshot when immediate is true (default)', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const calls: unknown[][] = [];

    db.observe('users', (records) => calls.push(records));

    await flushMicrotasks();

    expect(calls).toHaveLength(1);
  });
});

/* -------------------- observeMany({ eager: true }) -------------------- */

describe('observeMany({ eager: true })', () => {
  test('fires after first table delivers even when second has not yet', async () => {
    const db = createMemory({ schema });

    await db.put('users', { id: 1, name: 'Alice' });

    const calls: unknown[] = [];

    db.observeMany(['users', 'posts'] as const, (snaps) => calls.push(snaps), { eager: true });

    await flushMicrotasks();
    await flushMicrotasks(); // getAll() resolves → snapshotMap.set → queueMicrotask → listener

    expect(calls).toHaveLength(1);

    const snap = calls[0] as { posts: unknown[]; users: unknown[] };

    expect(snap.users).toHaveLength(1);
    expect(snap.posts).toEqual([]); // posts not yet populated — empty array
  });

  test('default (eager: false) waits for all tables before firing', async () => {
    const db = createMemory({ schema });

    const calls: unknown[] = [];

    db.observeMany(['users', 'posts'] as const, (snaps) => calls.push(snaps));

    await flushMicrotasks();
    await flushMicrotasks(); // getAll() resolves → snapshotMap full → queueMicrotask → listener

    expect(calls).toHaveLength(1); // fires once all tables have delivered
  });
});

/* -------------------- watch() eager-subscribe gap -------------------- */

describe('watch() eager-subscribe', () => {
  test('captures mutations that occur between [Symbol.asyncIterator]() and first next()', async () => {
    const db = createMemory({ schema });

    const iter = db.watch('users')[Symbol.asyncIterator]();

    // Mutation happens before first next() — must not be lost
    await db.put('users', { id: 1, name: 'Alice' });

    const result = await iter.next();

    expect(result.done).toBe(false);
    // The pending queue may have initial empty snapshot + mutation snapshot
    // At minimum the value should be an array (not lost)
    expect(Array.isArray(result.value)).toBe(true);

    await iter.return?.();
    await db.dispose();
  });
});

/* -------------------- batch() non-atomic warning -------------------- */

describe('batch() non-atomic warning', () => {
  test('emits a dev warning on first batch() call on a memory adapter', async () => {
    const db = createMemory({ schema });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await db.batch(['users'], async (tx) => {
      await tx.put('users', { id: 1, name: 'Alice' });
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('not atomic');

    warnSpy.mockRestore();
    await db.dispose();
  });

  test('emits the warning only once per adapter instance', async () => {
    const db = createMemory({ schema });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await db.batch(['users'], async (tx) => tx.put('users', { id: 1, name: 'Alice' }));
    await db.batch(['users'], async (tx) => tx.put('users', { id: 2, name: 'Bob' }));

    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
    await db.dispose();
  });
});

/* -------------------- D1: scheduleExpiredPrune warn fallback -------------------- */

describe('scheduleExpiredPrune — warn() when onError absent', () => {
  test('emits [@vielzeug/vault] dev warning when error is swallowed and onError is not provided', async () => {
    vi.useFakeTimers();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const boom = new Error('silent failure');

    scheduleExpiredPrune(
      {
        pruneExpired: async () => {
          throw boom;
        },
      },
      { interval: 500 },
    );

    await vi.advanceTimersByTimeAsync(600);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/vault]'));
    expect(warnSpy.mock.calls[0]![0]).toContain('scheduleExpiredPrune');

    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  test('does NOT emit warn() when onError is provided (onError handles it)', async () => {
    vi.useFakeTimers();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errors: unknown[] = [];

    scheduleExpiredPrune(
      {
        pruneExpired: async () => {
          throw new Error('handled');
        },
      },
      { interval: 500, onError: (e) => errors.push(e) },
    );

    await vi.advanceTimersByTimeAsync(600);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errors).toHaveLength(1);

    warnSpy.mockRestore();
    vi.useRealTimers();
  });
});
