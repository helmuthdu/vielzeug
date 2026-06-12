import { type Adapter, createMemory, type MetricsEvent, table, ttl, VaultScopeError } from '../index';

type User = { age?: number; city?: string; id: number; name?: string };
type Post = { id: number; title: string; userId: number };

const userSchema = { users: table<User>('id') };
const multiSchema = {
  posts: table<Post>('id'),
  users: table<User>('id'),
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('Memory adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    db = createMemory({ schema: userSchema });
  });

  test('put/get/delete roundtrip', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.delete('users', 1)).toBe(true);
    expect(await db.get('users', 1)).toBeUndefined();
  });

  test('putAll/getAll/clear', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.getAll('users')).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    await db.clear('users');
    expect(await db.getAll('users')).toEqual([]);
  });

  test('has reflects key existence', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.has('users', 1)).toBe(true);
    expect(await db.has('users', 2)).toBe(false);
  });

  test('count returns live records and clear empties table', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    expect(await db.count('users')).toBe(2);

    await db.clear('users');

    expect(await db.count('users')).toBe(0);
  });

  test('update rejects key mutation attempt', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    await expect(db.update('users', 1, { id: 2 } as Partial<User>)).rejects.toThrow('key');
  });

  test('update patches existing records', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.update('users', 1, { city: 'Paris' })).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
    await expect(db.update('users', 99, { city: 'Berlin' })).rejects.toThrow('not found');
  });

  test('upsert inserts when record does not exist', async () => {
    const result = await db.upsert('users', 1, () => ({ id: 1, name: 'Alice' }));

    expect(result).toEqual({ id: 1, name: 'Alice' });
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  test('upsert merges when record exists', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const result = await db.upsert('users', 1, (existing) => ({ ...existing!, city: 'Paris' }));

    expect(result).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
  });

  test('upsert rejects key mismatch', async () => {
    await expect(db.upsert('users', 1, () => ({ id: 2, name: 'Alice' }))).rejects.toThrow('key');
  });

  test('query.delete removes matching records', async () => {
    await db.putAll('users', [
      { age: 25, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
      { age: 35, id: 3, name: 'Charlie' },
    ]);

    const deleted = await db
      .query('users')
      .filter((u) => (u.age ?? 0) >= 30)
      .delete();

    expect(deleted).toBe(2);
    expect(await db.getAll('users')).toEqual([{ age: 25, id: 1, name: 'Alice' }]);
  });

  test('batch defers notifications until completion', async () => {
    const snapshots: User[][] = [];

    db.observe('users', (rows) => {
      snapshots.push([...rows]);
    });

    await Promise.resolve(); // consume initial empty snapshot

    await db.batch(['users'], async (tx) => {
      await tx.put('users', { id: 1, name: 'Alice' });
      await tx.put('users', { id: 2, name: 'Bob' });
    });

    await Promise.resolve();

    // Initial empty snapshot + one batch notification (not two)
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });

  test('batch supports upsert', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    await db.batch(['users'], async (tx) => {
      await tx.upsert('users', 1, (existing) => ({ ...existing!, city: 'Paris' }));
    });

    expect(await db.get('users', 1)).toEqual({ city: 'Paris', id: 1, name: 'Alice' });
  });

  test('batch rejects access to tables outside its declared scope', async () => {
    const multi = createMemory({ schema: multiSchema });

    await expect(
      multi.batch(['users'], async (tx) => {
        await tx.put('posts' as any, { id: 1, title: 'Hello', userId: 1 });
      }),
    ).rejects.toThrow('batch scope');

    expect(await multi.getAll('posts')).toEqual([]);
    multi.dispose();
  });

  test('batch requires at least one table', async () => {
    await expect(db.batch([], async () => undefined)).rejects.toThrow('at least one table');
  });

  test('query.delete() works inside batch()', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Carol' },
    ]);

    const deleted = await db.batch(['users'], (tx) =>
      tx
        .query('users')
        .filter((u) => u.id < 3)
        .delete(),
    );

    expect(deleted).toBe(2);
    expect(await db.getAll('users')).toEqual([{ id: 3, name: 'Carol' }]);
  });

  test('debug returns live and expired counts', async () => {
    await db.put('users', { id: 1, name: 'Alice' });
    await db.put('users', { id: 2, name: 'Bob' }, ttl.ms(1));

    await delay(5);

    const info = await db.debug();
    const userTable = info.tables.find((t) => t.name === 'users');

    expect(userTable?.recordCount).toBe(1);
    expect(userTable?.expiredCount).toBe(1);
  });

  test('schema defaultTtl is applied automatically', async () => {
    const ttlSchema = { sessions: table<{ token: string }>('token').ttl(ttl.ms(1)) };
    const db2 = createMemory({ schema: ttlSchema });

    await db2.put('sessions', { token: 'abc' }); // uses defaultTtl

    await delay(5);

    expect(await db2.get('sessions', 'abc')).toBeUndefined();
  });

  test('onMetrics callback receives events', async () => {
    const events: MetricsEvent[] = [];
    const db2 = createMemory({ onMetrics: (e) => events.push(e), schema: userSchema });

    await db2.put('users', { id: 1, name: 'Alice' });
    await db2.get('users', 1);

    expect(events.some((e) => e.operation === 'put' && e.table === 'users')).toBe(true);
    expect(events.some((e) => e.operation === 'get' && e.table === 'users')).toBe(true);
  });

  test('onMetrics emits getAll event', async () => {
    const events: MetricsEvent[] = [];
    const db2 = createMemory({ onMetrics: (e) => events.push(e), schema: userSchema });

    await db2.put('users', { id: 1, name: 'Alice' });
    await db2.put('users', { id: 2, name: 'Bob' });

    const results = await db2.getAll('users');

    expect(results).toHaveLength(2);
    expect(events.some((e) => e.operation === 'getAll' && e.table === 'users')).toBe(true);
  });

  test('onMetrics emits isEmpty event', async () => {
    const events: MetricsEvent[] = [];
    const db2 = createMemory({ onMetrics: (e) => events.push(e), schema: userSchema });

    await db2.isEmpty('users');

    expect(events.some((e) => e.operation === 'isEmpty' && e.table === 'users')).toBe(true);
  });

  test('onMetrics emits query and queryDelete events for query().delete()', async () => {
    const events: MetricsEvent[] = [];
    const db2 = createMemory({ onMetrics: (e) => events.push(e), schema: userSchema });

    await db2.put('users', { id: 1, name: 'Alice' });
    await db2.put('users', { id: 2, name: 'Bob' });

    const deleted = await db2
      .query('users')
      .filter((u) => u.id === 1)
      .delete();

    expect(deleted).toBe(1);
    expect(events.some((e) => e.operation === 'query' && e.table === 'users')).toBe(true);
    expect(events.some((e) => e.operation === 'queryDelete' && e.table === 'users')).toBe(true);
  });

  test('clear on empty table does not trigger observers', async () => {
    const snapshots: User[][] = [];
    const stop = db.observe('users', (rows) => snapshots.push(rows));

    await Promise.resolve(); // consume initial empty snapshot

    const lenAfterInit = snapshots.length; // 1: initial empty snapshot

    await db.clear('users'); // table is already empty

    await Promise.resolve();
    stop();

    // clear on empty table does not fire an additional notification
    expect(snapshots).toHaveLength(lenAfterInit);
  });

  test('clear does not notify observers when all records are TTL-expired', async () => {
    vi.useFakeTimers();

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    vi.advanceTimersByTime(2000); // all records are now logically expired

    const snapshots: User[][] = [];
    const stop = db.observe('users', (rows) => snapshots.push(rows));

    await Promise.resolve(); // consume initial empty snapshot (all expired = logical empty)

    const lenAfterInit = snapshots.length;

    await db.clear('users');
    await Promise.resolve();
    stop();

    // core.count() returns 0 (all expired), so clear() skips the notify call
    expect(snapshots).toHaveLength(lenAfterInit);

    vi.useRealTimers();
  });

  test('delete returns false for TTL-expired records', async () => {
    vi.useFakeTimers();

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(100));
    vi.advanceTimersByTime(200); // record is now expired

    // has() returns false for expired records
    expect(await db.has('users', 1)).toBe(false);
    // delete() is now consistent: returns false for expired records (not true)
    expect(await db.delete('users', 1)).toBe(false);
    // physical entry was cleaned up
    expect(await db.get('users', 1)).toBeUndefined();

    vi.useRealTimers();
  });

  test('ttl expiration removes entries lazily', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await db.has('users', 1)).toBe(false);
  });

  test('observe always emits initial snapshot on registration', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const snapshots: User[][] = [];
    const stop = db.observe('users', (rows) => {
      snapshots.push(rows);
    });

    await Promise.resolve();
    stop();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('observe always fires immediately (no silent registration)', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const snapshots: User[][] = [];
    const stop = db.observe('users', (rows) => {
      snapshots.push(rows);
    });

    await Promise.resolve();
    stop();

    // observe always fires: exactly one initial snapshot
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('instances are isolated', async () => {
    const other = createMemory({ schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await other.getAll('users')).toEqual([]);
  });

  test('listener errors do not block other observers', async () => {
    const received: User[][] = [];

    db.observe('users', () => {
      throw new Error('bad listener');
    });
    db.observe('users', (rows) => {
      received.push(rows);
    });

    await Promise.resolve(); // consume initial empty snapshots

    const lenAfterInit = received.length;

    await db.put('users', { id: 1, name: 'Alice' });
    await Promise.resolve();

    expect(received).toHaveLength(lenAfterInit + 1);
    expect(received[lenAfterInit]).toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('dispose prevents further observations', async () => {
    db.dispose();

    expect(() => db.observe('users', () => {})).toThrow('disposed');
  });

  test('getOrDefault returns existing record when present', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const result = await db.batch(['users'], async (tx) =>
      tx.getOrDefault('users', 1, () => ({ id: 1, name: 'Fallback' })),
    );

    expect(result).toEqual({ id: 1, name: 'Alice' });
    expect(await db.count('users')).toBe(1);
  });

  test('getOrDefault inserts and returns default when absent', async () => {
    const result = await db.batch(['users'], async (tx) =>
      tx.getOrDefault('users', 42, () => ({ id: 42, name: 'NewUser' })),
    );

    expect(result).toEqual({ id: 42, name: 'NewUser' });
    expect(await db.get('users', 42)).toEqual({ id: 42, name: 'NewUser' });
  });

  test('getOrDefault rejects default whose key mismatches the lookup key', async () => {
    await expect(
      db.batch(['users'], (tx) => tx.getOrDefault('users', 1, () => ({ id: 999, name: 'Mismatch' }))),
    ).rejects.toThrow('key');
  });

  test('deleteMany removes multiple records and returns deletion count', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    const deleted = await db.deleteMany('users', [1, 3]);

    expect(deleted).toBe(2);
    expect(await db.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('deleteMany returns 0 when no keys match', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.deleteMany('users', [99, 100])).toBe(0);
    expect(await db.count('users')).toBe(1);
  });

  test('batch supports deleteMany within scope', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    const deleted = await db.batch(['users'], async (tx) => tx.deleteMany('users', [1, 2]));

    expect(deleted).toBe(2);
    expect(await db.getAll('users')).toEqual([{ id: 3, name: 'Charlie' }]);
  });

  test('cross-tab BroadcastChannel sync: put on one instance notifies the other', async () => {
    const db1 = createMemory({ name: 'sync-test', schema: userSchema });
    const db2 = createMemory({ name: 'sync-test', schema: userSchema });

    try {
      const received = new Promise<User[]>((resolve) => {
        const stop = db2.observe('users', (rows) => {
          if (rows.length > 0) {
            stop();
            resolve(rows);
          }
        });
      });

      await db1.put('users', { id: 7, name: 'Remote' });
      // BroadcastChannel is synchronous in the jsdom test environment
      await Promise.resolve();

      expect(await received).toEqual([{ id: 7, name: 'Remote' }]);
    } finally {
      db1.dispose();
      db2.dispose();
    }
  });

  test('cross-tab BroadcastChannel sync: clear propagates to the other instance', async () => {
    const db1 = createMemory({ name: 'sync-clear', schema: userSchema });
    const db2 = createMemory({ name: 'sync-clear', schema: userSchema });

    try {
      await db1.put('users', { id: 1, name: 'Alice' });
      await Promise.resolve(); // let db2 receive the put

      await db1.clear('users');
      await Promise.resolve();

      expect(await db2.count('users')).toBe(0);
    } finally {
      db1.dispose();
      db2.dispose();
    }
  });

  test('unnamed createMemory instances are not synced via BroadcastChannel', async () => {
    const db1 = createMemory({ schema: userSchema });
    const db2 = createMemory({ schema: userSchema });

    try {
      await db1.put('users', { id: 1, name: 'Alice' });
      await Promise.resolve();

      expect(await db2.count('users')).toBe(0);
    } finally {
      db1.dispose();
      db2.dispose();
    }
  });

  describe('BroadcastChannel security', () => {
    test('malformed message is silently discarded', async () => {
      const db1 = createMemory({ name: 'sec-malformed', schema: userSchema });
      const db2 = createMemory({ name: 'sec-malformed', schema: userSchema });

      try {
        const spy = vi.fn();

        db2.observe('users', spy);

        await Promise.resolve(); // consume initial empty snapshot

        // Inject a completely malformed message on the shared channel
        const attacker = new BroadcastChannel('vault-memory:sec-malformed');

        attacker.postMessage('not an object');
        attacker.postMessage(null);
        attacker.postMessage({ type: 'put' }); // missing table and key
        attacker.postMessage({ table: 'users', type: 'unknown-type' });
        attacker.close();

        const callsBefore = spy.mock.calls.length;

        await Promise.resolve();

        // No additional calls from malformed messages
        expect(spy.mock.calls.length).toBe(callsBefore);
        expect(await db2.count('users')).toBe(0);
      } finally {
        db1.dispose();
        db2.dispose();
      }
    });

    test('put message with invalid stored envelope is discarded', async () => {
      const db1 = createMemory({ name: 'sec-bad-envelope', schema: userSchema });
      const db2 = createMemory({ name: 'sec-bad-envelope', schema: userSchema });

      try {
        const attacker = new BroadcastChannel('vault-memory:sec-bad-envelope');

        // stored has no value field — fails parseStored validation
        attacker.postMessage({ key: '1', stored: { notValue: 'injection' }, table: 'users', type: 'put' });
        attacker.close();

        await Promise.resolve();

        expect(await db2.count('users')).toBe(0);
      } finally {
        db1.dispose();
        db2.dispose();
      }
    });

    test('message with __proto__ table name is rejected by isBroadcastMsg guard', async () => {
      const db1 = createMemory({ name: 'sec-proto-table', schema: userSchema });
      const db2 = createMemory({ name: 'sec-proto-table', schema: userSchema });

      try {
        const attacker = new BroadcastChannel('vault-memory:sec-proto-table');

        attacker.postMessage({ key: '1', stored: { value: { id: 1 } }, table: '__proto__', type: 'put' });
        attacker.postMessage({ key: '1', stored: { value: { id: 1 } }, table: 'constructor', type: 'put' });
        attacker.close();

        await Promise.resolve();

        // Prototype-polluting table names must be silently discarded
        expect(await db2.count('users')).toBe(0);
        expect(Object.prototype).not.toHaveProperty('id');
      } finally {
        db1.dispose();
        db2.dispose();
      }
    });

    test('put message for an unknown table is discarded', async () => {
      const db1 = createMemory({ name: 'sec-unknown-table', schema: userSchema });
      const db2 = createMemory({ name: 'sec-unknown-table', schema: userSchema });

      try {
        const attacker = new BroadcastChannel('vault-memory:sec-unknown-table');

        attacker.postMessage({ key: '1', stored: { value: { id: 1, name: 'Evil' } }, table: 'phantom', type: 'put' });
        attacker.close();

        await Promise.resolve();

        // phantom table not in schema — store is undefined, message dropped
        expect(await db2.count('users')).toBe(0);
      } finally {
        db1.dispose();
        db2.dispose();
      }
    });

    test('put message with valid envelope but failing validator is discarded', async () => {
      const strictSchema = { users: table<User>('id') };
      const strictValidator = {
        parse: (v: unknown): User => {
          const u = v as User;

          if (typeof u.name !== 'string') throw new Error('name must be a string');

          return u;
        },
      };

      const db1 = createMemory({ name: 'sec-validator', schema: strictSchema, validators: { users: strictValidator } });
      const db2 = createMemory({ name: 'sec-validator', schema: strictSchema, validators: { users: strictValidator } });

      try {
        const attacker = new BroadcastChannel('vault-memory:sec-validator');

        // Valid envelope, but value fails validator (name is a number)
        attacker.postMessage({ key: '1', stored: { value: { id: 1, name: 42 } }, table: 'users', type: 'put' });
        attacker.close();

        await Promise.resolve();

        expect(await db2.count('users')).toBe(0);
      } finally {
        db1.dispose();
        db2.dispose();
      }
    });

    test('valid put message with validator passes and is applied', async () => {
      const strictValidator = { parse: (v: unknown): User => v as User };

      const db1 = createMemory({ name: 'sec-valid', schema: userSchema, validators: { users: strictValidator } });
      const db2 = createMemory({ name: 'sec-valid', schema: userSchema, validators: { users: strictValidator } });

      try {
        // Use an observer to await the BroadcastChannel message delivery (macrotask)
        const received = new Promise<User>((resolve) => {
          const stop = db2.observe('users', (rows) => {
            const found = rows.find((r) => r.id === 99);

            if (found) {
              stop();
              resolve(found);
            }
          });
        });

        await db1.put('users', { id: 99, name: 'Legit' });

        expect(await received).toEqual({ id: 99, name: 'Legit' });
      } finally {
        db1.dispose();
        db2.dispose();
      }
    });

    test('throwing codec during message validation does not kill the onmessage handler', async () => {
      // Codec throws when it sees the "poison" sentinel value — simulates a corrupt record
      // that causes the codec to throw during isBroadcastMsg validation.
      const POISON = '__POISON__';
      const poisonCodec = {
        decode: (raw: unknown): { expiresAt?: number; value: unknown } | undefined => {
          if (typeof raw === 'object' && raw !== null && (raw as Record<string, unknown>)['__poison']) {
            throw new Error('codec exploded on poison record');
          }

          if (typeof raw !== 'object' || raw === null || !('value' in raw)) return undefined;

          return raw as { value: unknown };
        },
        encode: (value: unknown, expiresAt?: number) => (expiresAt !== undefined ? { expiresAt, value } : { value }),
      };

      const db2 = createMemory({ codec: poisonCodec, name: 'sec-throwing-codec3', schema: userSchema });

      try {
        const attacker = new BroadcastChannel('vault-memory:sec-throwing-codec3');

        // Message 1: stored is a poison value — codec.decode throws during isBroadcastMsg; must be dropped silently.
        attacker.postMessage({
          key: '1',
          stored: { __poison: true, [POISON]: true, value: { id: 1 } },
          table: 'users',
          type: 'put',
        });
        // Message 2: valid stored record — codec succeeds.
        attacker.postMessage({ key: '2', stored: { value: { id: 2, name: 'Valid' } }, table: 'users', type: 'put' });
        attacker.close();

        await new Promise<void>((r) => setTimeout(r, 10));

        // Handler survived the throw: message 2 was applied.
        expect(await db2.has('users', 2)).toBe(true);
        // id:1 poison was dropped.
        expect(await db2.has('users', 1)).toBe(false);
      } finally {
        db2.dispose();
      }
    });

    test('put message with mismatched key/record primary key is discarded', async () => {
      const db1 = createMemory({ name: 'sec-key-mismatch', schema: userSchema });
      const db2 = createMemory({ name: 'sec-key-mismatch', schema: userSchema });

      try {
        const attacker = new BroadcastChannel('vault-memory:sec-key-mismatch');

        // key claims to be "1" but value has id: 99 — key/value mismatch should be rejected
        attacker.postMessage({
          key: '1',
          stored: { value: { id: 99, name: 'Injected' } },
          table: 'users',
          type: 'put',
        });
        attacker.close();

        await Promise.resolve();

        expect(await db2.count('users')).toBe(0);
      } finally {
        db1.dispose();
        db2.dispose();
      }
    });
  });

  describe('observeMany', () => {
    type Post = { authorId: number; id: number; title: string };

    const multiSchema = {
      posts: table<Post>('id'),
      users: table<User>('id'),
    };

    let multiDb: Adapter<typeof multiSchema>;

    beforeEach(() => {
      multiDb = createMemory({ name: 'multi', schema: multiSchema });
    });

    afterEach(async () => {
      await multiDb.dispose();
    });

    test('fires combined snapshot after all tables deliver initial state', async () => {
      await multiDb.put('users', { id: 1, name: 'Alice' });
      await multiDb.put('posts', { authorId: 1, id: 1, title: 'Hello' });

      const snapshots: { posts: Post[]; users: User[] }[] = [];
      const stop = multiDb.observeMany(['users', 'posts'], (s) => snapshots.push(s));

      await new Promise<void>((r) => setTimeout(r, 0));
      stop();

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].users).toEqual([{ id: 1, name: 'Alice' }]);
      expect(snapshots[0].posts).toEqual([{ authorId: 1, id: 1, title: 'Hello' }]);
    });

    test('coalesces batch writes across multiple tables into one callback', async () => {
      const snapshots: { posts: Post[]; users: User[] }[] = [];
      const stop = multiDb.observeMany(['users', 'posts'], (s) => snapshots.push(s));

      // Wait for the initial prefetch to complete before triggering writes.
      await new Promise<void>((r) => setTimeout(r, 0));

      await multiDb.batch(['users', 'posts'], async (tx) => {
        await tx.put('users', { id: 1, name: 'Alice' });
        await tx.put('posts', { authorId: 1, id: 1, title: 'Hello' });
      });

      await new Promise<void>((r) => setTimeout(r, 0));
      stop();

      expect(snapshots).toHaveLength(2);
      expect(snapshots[1].users).toHaveLength(1);
      expect(snapshots[1].posts).toHaveLength(1);
    });

    test('throws VaultScopeError when tables array is empty', () => {
      expect(() => multiDb.observeMany([], () => {})).toThrow(VaultScopeError);
    });

    test('stop unsubscribes all underlying observers', async () => {
      const snapshots: { posts: Post[]; users: User[] }[] = [];
      const stop = multiDb.observeMany(['users', 'posts'], (s) => snapshots.push(s));

      stop();

      await multiDb.put('users', { id: 1, name: 'Alice' });
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(snapshots).toHaveLength(0);
    });

    test('fires after single-table change when only one observed table receives a mutation', async () => {
      // Regression: before the prefetch fix, writing only to users would never trigger
      // the listener because posts had never delivered a snapshot.
      const snapshots: { posts: Post[]; users: User[] }[] = [];
      const stop = multiDb.observeMany(['users', 'posts'], (s) => snapshots.push(s));

      // Wait for initial prefetch of both tables to complete.
      await new Promise<void>((r) => setTimeout(r, 0));

      // Write only to users — posts is never touched.
      await multiDb.put('users', { id: 1, name: 'Alice' });
      await new Promise<void>((r) => setTimeout(r, 0));
      stop();

      expect(snapshots).toHaveLength(2);
      expect(snapshots[1].users).toEqual([{ id: 1, name: 'Alice' }]);
      expect(snapshots[1].posts).toEqual([]);
    });

    test('stop() before prefetch resolves does not leak observers', async () => {
      // Call stop() synchronously — the prefetch promise has not yet resolved.
      const snapshots: { posts: Post[]; users: User[] }[] = [];
      const stop = multiDb.observeMany(['users', 'posts'], (s) => snapshots.push(s));

      // stop() before any await — prefetch .then() has not fired yet
      stop();

      // Let the prefetch and its .then() resolve
      await new Promise<void>((r) => setTimeout(r, 0));

      // Any subsequent mutation must NOT reach the listener
      await multiDb.put('users', { id: 1, name: 'Alice' });
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(snapshots).toHaveLength(0);
    });

    test('fires listener when observed tables start empty', async () => {
      // Normal operation: both tables prefetch successfully with empty arrays and
      // mutations subsequently trigger the listener.
      const snapshots: { posts: Post[]; users: User[] }[] = [];
      const stop = multiDb.observeMany(['users', 'posts'], (s) => snapshots.push(s));

      await new Promise<void>((r) => setTimeout(r, 0));

      await multiDb.put('users', { id: 1, name: 'Alice' });
      await new Promise<void>((r) => setTimeout(r, 0));
      stop();

      expect(snapshots).toHaveLength(2);
      expect(snapshots[1].users).toEqual([{ id: 1, name: 'Alice' }]);
      expect(snapshots[1].posts).toEqual([]);
    });

    test('subscription stays live when a prefetch getAll() throws (empty-array fallback)', async () => {
      // Regression: before the fix, a single failing prefetch left snapshotMap.size <
      // distinctTables.length permanently, making scheduleFlush a no-op forever.
      // The fix inserts an empty-array fallback in the .catch() handler so the guard
      // is satisfied and subsequent mutations still reach the listener.
      vi.spyOn(multiDb, 'getAll').mockRejectedValueOnce(new Error('simulated prefetch failure'));

      const snapshots: { posts: Post[]; users: User[] }[] = [];
      const stop = multiDb.observeMany(['users', 'posts'], (s) => snapshots.push(s));

      // Wait for both prefetch promises (one of which throws) to settle.
      await new Promise<void>((r) => setTimeout(r, 0));

      // Mutation must still reach the listener despite the earlier prefetch failure.
      await multiDb.put('users', { id: 1, name: 'Alice' });
      await new Promise<void>((r) => setTimeout(r, 0));
      stop();

      expect(snapshots).toHaveLength(2);
      expect(snapshots[1].users).toEqual([{ id: 1, name: 'Alice' }]);
    });

    test('stop() called during prefetch .then() callback does not leak registered observers', async () => {
      // Tests the double-check: stop() is called synchronously inside the immediate-flush
      // path which fires from within the .then() callback itself.
      let calls = 0;
      const stopRef = { fn: (): void => {} };

      const stop = multiDb.observeMany(['users', 'posts'], (_s) => {
        calls += 1;
        // Stop on first call — simulates stop() called during a flush triggered by the .then()
        stopRef.fn();
      });

      stopRef.fn = stop;

      // Wait for prefetch + immediate flush
      await new Promise<void>((r) => setTimeout(r, 0));

      // Mutations after stop must not trigger further callbacks
      await multiDb.put('users', { id: 1, name: 'Alice' });
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(calls).toBe(1); // fired exactly once (the immediate flush), then stopped
    });

    test('deduplicates tables — fires listener exactly once per microtask even with duplicate entries', async () => {
      const snapshots: { users: User[] }[] = [];
      // Pass 'users' twice — should register only one observer and fire only once per change.
      const stop = (multiDb as unknown as Adapter<{ users: (typeof multiSchema)['users'] }>).observeMany(
        ['users', 'users'] as const,
        (s) => snapshots.push(s as { users: User[] }),
      );

      await new Promise<void>((r) => setTimeout(r, 0));

      await multiDb.put('users', { id: 1, name: 'Alice' });
      await new Promise<void>((r) => setTimeout(r, 0));
      stop();

      expect(snapshots).toHaveLength(2);
    });
  });
});
