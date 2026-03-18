import { type Adapter, createLocalStorage, defineSchema } from '../index';

/* -------------------- Shared fixtures -------------------- */

type User = { age?: number; city?: string; id: number; name?: string };

const userSchema = defineSchema<{ users: User }>({
  users: { indexes: ['name', 'age', 'city'], key: 'id' },
});

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ==================== LocalStorage adapter ==================== */

describe('LocalStorage adapter', () => {
  let db: Adapter<typeof userSchema>;

  beforeEach(() => {
    localStorage.clear();
    db = createLocalStorage({ dbName: 'LS', schema: userSchema });
  });

  describe('CRUD', () => {
    test('put / get', async () => {
      await db.put('users', { id: 1, name: 'Alice' });
      expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('put array / getAll', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(await db.getAll('users')).toHaveLength(2);
    });

    test('patch – returns merged record on hit', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });
      expect(await db.patch('users', 1, { name: 'Alicia' })).toEqual({ age: 25, id: 1, name: 'Alicia' });
    });

    test('patch – returns undefined when key absent', async () => {
      expect(await db.patch('users', 99, { name: 'Ghost' })).toBeUndefined();
    });

    test('patch – no follow-up get needed', async () => {
      await db.put('users', { age: 25, id: 1, name: 'Alice' });

      const updated = await db.patch('users', 1, { age: 26 });

      expect(updated).toEqual({ age: 26, id: 1, name: 'Alice' });
    });

    test('delete single', async () => {
      await db.put('users', { id: 1 });
      await db.delete('users', 1);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('delete array removes only specified keys', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }, { id: 3 }]);
      await db.deleteMany('users', [1, 3]);
      expect(await db.getAll('users')).toEqual([{ id: 2 }]);
    });

    test('deleteAll empties the table', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }]);
      await db.deleteAll('users');
      expect(await db.getAll('users')).toEqual([]);
    });

    test('count tracks live records', async () => {
      expect(await db.count('users')).toBe(0);
      await db.putMany('users', [{ id: 1 }, { id: 2 }]);
      expect(await db.count('users')).toBe(2);
    });

    test('has', async () => {
      await db.put('users', { id: 1 });
      expect(await db.has('users', 1)).toBe(true);
      expect(await db.has('users', 99)).toBe(false);
    });

    test('getOrPut – returns cached value; factory not called', async () => {
      await db.put('users', { id: 1, name: 'Alice' });

      const factory = vi.fn();

      expect(await db.getOrPut('users', 1, factory)).toEqual({ id: 1, name: 'Alice' });
      expect(factory).not.toHaveBeenCalled();
    });

    test('getOrPut – stores factory value on miss', async () => {
      const result = await db.getOrPut('users', 5, () => ({ id: 5, name: 'Eve' }));

      expect(result).toEqual({ id: 5, name: 'Eve' });
      expect(await db.get('users', 5)).toEqual({ id: 5, name: 'Eve' });
    });

    test('getMany – returns only found records', async () => {
      await db.putMany('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      expect(await db.getMany('users', [1, 2, 99])).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    test('getMany – empty keys returns empty array', async () => {
      await db.putMany('users', [{ id: 1, name: 'Alice' }]);
      expect(await db.getMany('users', [])).toEqual([]);
    });

    test('getOrPut – async factory is awaited', async () => {
      const result = await db.getOrPut('users', 7, async () => {
        await Promise.resolve();

        return { id: 7, name: 'Async' };
      });

      expect(result).toEqual({ id: 7, name: 'Async' });
      expect(await db.get('users', 7)).toEqual({ id: 7, name: 'Async' });
    });
  });

  describe('TTL', () => {
    test('record is invisible after TTL expires', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 1);
      await delay(5);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('getAll excludes all expired records', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }], 1);
      await delay(5);
      expect(await db.getAll('users')).toEqual([]);
    });

    test('count excludes expired records', async () => {
      await db.putMany('users', [{ id: 1 }, { id: 2 }], 1);
      await db.put('users', { id: 3 });
      await delay(5);
      expect(await db.count('users')).toBe(1);
    });

    test('update preserves TTL', async () => {
      await db.put('users', { id: 1, name: 'Alice' }, 50);

      const updated = await db.patch('users', 1, { name: 'Alicia' });

      expect(updated).toEqual({ id: 1, name: 'Alicia' });
      await delay(55);
      expect(await db.get('users', 1)).toBeUndefined();
    });

    test('getOrPut with TTL – stored value expires', async () => {
      await db.getOrPut('users', 1, () => ({ id: 1, name: 'Alice' }), 1);
      await delay(5);
      expect(await db.get('users', 1)).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('getOr returns defaultValue when key absent', async () => {
      const fallback = { id: 0, name: 'Fallback' };

      expect(await db.getOr('users', 0, fallback)).toBe(fallback);
    });

    test('delete non-existent key is silent', async () => {
      await expect(db.delete('users', 999)).resolves.toBeUndefined();
    });

    test('deleteAll on empty table is silent', async () => {
      await expect(db.deleteAll('users')).resolves.toBeUndefined();
    });

    test('corrupted entry is evicted and returns undefined', async () => {
      localStorage.setItem('LS:users:1', '{bad json');
      expect(await db.get('users', 1)).toBeUndefined();
      expect(localStorage.getItem('LS:users:1')).toBeNull();
    });

    test('indexes declaration emits a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      createLocalStorage({ dbName: 'Warn', schema: userSchema });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('indexes'));
      warnSpy.mockRestore();
    });

    test('from filters stored records', async () => {
      await db.putMany('users', [
        { age: 25, id: 1, name: 'Alice' },
        { age: 30, id: 2, name: 'Bob' },
      ]);

      const r = await db.from('users').equals('age', 30).toArray();

      expect(r).toEqual([{ age: 30, id: 2, name: 'Bob' }]);
    });

    test('inline schema without separate defineSchema variable', async () => {
      const inlineDb = createLocalStorage({
        dbName: 'Inline',
        schema: defineSchema<{ items: { id: number; label: string } }>({ items: { key: 'id' } }),
      });

      await inlineDb.put('items', { id: 1, label: 'hello' });
      expect(await inlineDb.get('items', 1)).toEqual({ id: 1, label: 'hello' });
    });

    test('checkStorage guards getMany when storage unavailable', async () => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;

      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('SecurityError');
        },
      });

      try {
        await expect(db.getMany('users', [1])).rejects.toThrow();
      } finally {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      }
    });

    test('checkStorage guards patch when storage unavailable', async () => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;

      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('SecurityError');
        },
      });

      try {
        await expect(db.patch('users', 1, { name: 'X' })).rejects.toThrow();
      } finally {
        Object.defineProperty(globalThis, 'localStorage', descriptor);
      }
    });
  });
});

/* ==================== Logger ==================== */

describe('Logger', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('custom logger receives warnings for corrupted data', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const db = createLocalStorage({
      dbName: 'LogTest',
      logger: {
        error: (...args: unknown[]) => console.error('[deposit-test]', ...args),
        warn: (...args: unknown[]) => console.warn('[deposit-test]', ...args),
      },
      schema: userSchema,
    });

    localStorage.setItem('LogTest:users:1', '{bad json');
    await db.get('users', 1);

    const scopedCall = warnSpy.mock.calls.find((c) =>
      c.some((a) => typeof a === 'string' && a.includes('deposit-test')),
    );

    expect(scopedCall).toBeDefined();
    warnSpy.mockRestore();
  });

  test('console is used as default logger', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const simpleSchema = defineSchema<{ items: { id: number } }>({ items: { key: 'id' } });
    const db = createLocalStorage({ dbName: 'Default', schema: simpleSchema });

    localStorage.setItem('Default:items:1', '{bad json');
    await db.get('items', 1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Removing corrupted entry'), expect.any(Error));
    warnSpy.mockRestore();
  });
});
