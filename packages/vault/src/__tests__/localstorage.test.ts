import {
  count,
  deleteMany,
  has,
  isEmpty,
  type KeyValueVaultStore,
  table,
  ttl,
  update,
  upsert,
  VaultDisposedError,
  validatorCodec,
} from '../index';
import { createLocalStorage } from '../local-storage';

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = { users: table<User>('id') };
const codecs = { users: validatorCodec({ parse: (v) => v as User }) };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('LocalStorage adapter', () => {
  let db: KeyValueVaultStore<typeof userSchema>;

  beforeEach(() => {
    window.localStorage.clear();
    db = createLocalStorage({ codecs, name: 'LS', schema: userSchema });
  });

  test('put/get and delete roundtrip', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(await db.delete('users', 1)).toBe(true);
    expect(await db.get('users', 1)).toBeUndefined();
  });

  test('clear removes table-prefixed records only', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    window.localStorage.setItem('LS\x00other\x001', JSON.stringify({ value: { id: 1 } }));

    await db.clear('users');

    expect(await db.getAll('users')).toEqual([]);
    expect(window.localStorage.getItem('LS\x00other\x001')).not.toBeNull();
  });

  test('has and update work as expected (derived helpers)', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    expect(await has(db, 'users', 1)).toBe(true);
    expect(await update(db, 'users', 1, { city: 'Paris' })).toEqual({
      city: 'Paris',
      id: 1,
      name: 'Alice',
    });
  });

  test('upsert inserts when record does not exist (derived helper)', async () => {
    const result = await upsert(db, 'users', 1, () => ({ id: 1, name: 'Alice' }));

    expect(result).toEqual({ id: 1, name: 'Alice' });
  });

  test('deleteMany removes matching records (derived helper)', async () => {
    await db.putAll('users', [
      { age: 20, id: 1, name: 'Alice' },
      { age: 30, id: 2, name: 'Bob' },
    ]);

    expect(await deleteMany(db, 'users', [1])).toBe(1);
    expect(await db.getAll('users')).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
  });

  test('ttl expiration is respected', async () => {
    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1));
    await delay(5);

    expect(await db.get('users', 1)).toBeUndefined();
    expect(await has(db, 'users', 1)).toBe(false);
  });

  test('storage clear event notifies observers', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    const snapshots: User[][] = [];
    const stop = db.observe('users', (rows) => {
      snapshots.push(rows);
    });

    await Promise.resolve(); // consume initial snapshot (has 'Alice' — put above)

    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    await Promise.resolve();
    stop();

    // Initial snapshot (Alice) + clear event snapshot (empty)
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toEqual([]);
  });

  test('corrupted entries are removed lazily on read', async () => {
    // Simulate a corrupted entry from a *previous session* by writing it
    // before creating a fresh adapter — initOwnedKeys() will see it on startup.
    window.localStorage.setItem('LS\x00users\x0099', 'not valid json {{{');
    db = createLocalStorage({ codecs, name: 'LS', schema: userSchema });

    expect(await db.getAll('users')).toEqual([]);
    expect(window.localStorage.getItem('LS\x00users\x0099')).toBeNull();
  });

  test('pruneExpired removes expired records from localStorage and returns count', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await db.put('users', { id: 2, name: 'Bob' }, ttl.ms(1000));
    await db.put('users', { id: 3, name: 'Charlie' }); // no TTL

    vi.advanceTimersByTime(2000);

    const result = await db.pruneExpired();

    vi.useRealTimers();

    expect(result.users).toBe(2);

    // Physical localStorage keys for expired records should be gone
    expect(window.localStorage.getItem('LS\x00users\x001')).toBeNull();
    expect(window.localStorage.getItem('LS\x00users\x002')).toBeNull();

    // Live record still present
    expect(await db.get('users', 3)).toEqual({ id: 3, name: 'Charlie' });
  });

  test('ownedKeys: foreign-prefixed keys in localStorage are invisible to the adapter', async () => {
    // Keys from a different app or adapter name must not appear in count/getAll
    window.localStorage.setItem('OTHER\x00users\x001', JSON.stringify({ value: { id: 1, name: 'Ghost' } }));
    window.localStorage.setItem('raw-unrelated-key', 'noise');

    await db.put('users', { id: 2, name: 'Alice' });

    expect(await count(db, 'users')).toBe(1);
    expect(await db.getAll('users')).toEqual([{ id: 2, name: 'Alice' }]);
  });

  test('deleteMany removes multiple records and returns deletion count', async () => {
    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    const deleted = await deleteMany(db, 'users', [1, 3]);

    expect(deleted).toBe(2);
    expect(await db.getAll('users')).toEqual([{ id: 2, name: 'Bob' }]);
  });

  test('deleteMany does not count TTL-expired entries as deleted', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    await db.put('users', { id: 1, name: 'Alice' }, ttl.ms(1000));
    await db.put('users', { id: 2, name: 'Bob' }); // no TTL

    vi.advanceTimersByTime(2000); // Alice is now expired

    // Attempt to delete both — Alice is expired, Bob is live
    const deleted = await deleteMany(db, 'users', [1, 2]);

    vi.useRealTimers();

    // Only the live record counts as deleted
    expect(deleted).toBe(1);
    expect(await db.get('users', 2)).toBeUndefined(); // was deleted
  });

  test('StorageEvent from an unknown table does not grow ownedKeys', async () => {
    await db.put('users', { id: 1, name: 'Alice' });

    // Simulate a cross-tab write to a key that matches the db prefix but uses a table
    // not in our schema — should be ignored by the StorageEvent handler.
    const fakeKey = 'LS\x00phantom\x0042';

    window.localStorage.setItem(fakeKey, JSON.stringify({ value: { id: 42 } }));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: fakeKey,
        newValue: JSON.stringify({ value: { id: 42 } }),
      }),
    );

    await Promise.resolve();

    // Our schema only has 'users' — phantom table key must not be tracked
    expect(await count(db, 'users')).toBe(1);
    // Cross-tab write to phantom table must not trigger a users observer
  });

  test('keeps table-wide reads synchronized across same-window store instances', async () => {
    const second = createLocalStorage({ codecs, name: 'LS', schema: userSchema });

    await db.put('users', { id: 1, name: 'Alice' });

    await expect(second.get('users', 1)).resolves.toEqual({ id: 1, name: 'Alice' });
    await expect(second.getAll('users')).resolves.toEqual([{ id: 1, name: 'Alice' }]);
  });

  test('surfaces codec failures without deleting persisted data', async () => {
    const key = 'LS\x00users\x00n:1';
    const raw = JSON.stringify({ value: { id: 1, name: 'Alice' } });
    window.localStorage.setItem(key, raw);
    const strict = createLocalStorage({
      codecs: {
        users: {
          decode() {
            throw new Error('schema mismatch');
          },
          encode: (value) => value,
        },
      },
      name: 'LS',
      schema: userSchema,
    });

    await expect(strict.get('users', 1)).rejects.toThrow('validation failed');
    expect(window.localStorage.getItem(key)).toBe(raw);
  });

  test('clears persisted records that no longer satisfy the codec', async () => {
    const key = 'LS\x00users\x00n:1';
    window.localStorage.setItem(key, JSON.stringify({ value: { id: 1, name: 'Alice' } }));
    const strict = createLocalStorage({
      codecs: {
        users: {
          decode() {
            throw new Error('schema mismatch');
          },
          encode: (value) => value,
        },
      },
      name: 'LS',
      schema: userSchema,
    });

    await strict.clear('users');

    expect(window.localStorage.getItem(key)).toBeNull();
  });

  test('isEmpty() returns true for empty table, false when records exist', async () => {
    expect(await isEmpty(db, 'users')).toBe(true);

    await db.put('users', { id: 1, name: 'Alice' });

    expect(await isEmpty(db, 'users')).toBe(false);

    await db.clear('users');

    expect(await isEmpty(db, 'users')).toBe(true);
  });
});

describe('VaultDisposedError default message', () => {
  test('no-arg constructor produces a meaningful message', () => {
    const err = new VaultDisposedError();

    expect(err.message).toContain('disposed');
    expect(err instanceof VaultDisposedError).toBe(true);
  });
});
