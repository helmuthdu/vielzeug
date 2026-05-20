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

    // observe fires immediately → signal updated with empty array
    await new Promise<void>((r) => setTimeout(r, 10));
    expect(latest).toEqual([]);

    await db.put('users', { id: 1, name: 'Alice' });
    await new Promise<void>((r) => setTimeout(r, 10));

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

    await new Promise<void>((r) => setTimeout(r, 10)); // initial fire

    postUpdates = 0;
    await db.put('users', { id: 1, name: 'Alice' }); // users mutation
    await new Promise<void>((r) => setTimeout(r, 10));

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

    await new Promise<void>((r) => setTimeout(r, 10)); // initial

    const countBeforeDispose = callCount;

    db.dispose();
    await db.put('users', { id: 1, name: 'Alice' }).catch(() => {}); // may throw after dispose
    await new Promise<void>((r) => setTimeout(r, 10));

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

  test('queues multiple mutations fired before next() is awaited', async () => {
    const db = createMemory({ schema });
    const iter = db.watch('users')[Symbol.asyncIterator]();

    // consume immediate empty snapshot
    await iter.next();

    // Fire two mutations before reading
    await db.put('users', { id: 1, name: 'A' });
    await db.put('users', { id: 2, name: 'B' });

    // Should get the first mutation snapshot
    const first = await iter.next();

    expect(first.done).toBe(false);

    // And the second
    const second = await iter.next();

    expect(second.done).toBe(false);
    expect(second.value).toHaveLength(2);

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
  let originalSetItem: typeof Storage.prototype.setItem;

  beforeEach(() => {
    originalSetItem = Storage.prototype.setItem;
  });

  afterEach(() => {
    Storage.prototype.setItem = originalSetItem;
    localStorage.clear();
  });

  test('throws by default when quota is exceeded', async () => {
    Storage.prototype.setItem = () => {
      const err = new DOMException('QuotaExceededError', 'QuotaExceededError');

      throw err;
    };

    const db = createLocalStorage({ name: 'test-quota', schema });

    await expect(db.put('users', { id: 1, name: 'Alice' })).rejects.toThrow('quota exceeded');
  });

  test('ignores write when onQuotaExceeded returns "ignore"', async () => {
    let exceeded = false;

    Storage.prototype.setItem = () => {
      const err = new DOMException('QuotaExceededError', 'QuotaExceededError');

      throw err;
    };

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
