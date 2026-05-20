/**
 * Tests for features added in the "future improvements" pass:
 *   - signals (ReactiveSignal plugin)
 *   - watch() AsyncIterable
 *   - getMany()
 *   - pruneExpired() + scheduleExpiredPrune
 *   - onQuotaExceeded hook (WebStorage)
 */

import type { ReactiveSignal } from '../index';

import { createLocalStorage, createMemory, scheduleExpiredPrune, table, ttl } from '../index';

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

  test('stateit-shaped signal satisfies ReactiveSignal structurally', () => {
    // Simulates a stateit Signal<User[]>: has update(fn) among other methods
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
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const db = createLocalStorage({ name: 'test-quota', schema });

    await expect(db.put('users', { id: 1, name: 'Alice' })).rejects.toThrow('quota exceeded');
  });

  test('ignores write when onQuotaExceeded returns "ignore"', async () => {
    let exceeded = false;

    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
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
