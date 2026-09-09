import { count, has, isEmpty, table } from '../index';
import { createMemory } from '../memory';

type User = { id: number | string; name: string };

const schema = { users: table<User>('id') };

describe('Memory KeyValueVaultStore', () => {
  test('supports portable string and number keys without collisions', async () => {
    const store = createMemory({ schema });

    await store.put('users', { id: 1, name: 'Ada' });
    await store.put('users', { id: '1', name: 'Grace' });

    expect(await count(store, 'users')).toBe(2);
    expect(await store.get('users', 1)).toEqual({ id: 1, name: 'Ada' });
    expect(await store.get('users', '1')).toEqual({ id: '1', name: 'Grace' });
  });

  test('does not expose document-store-only transactions or iteration', () => {
    const store = createMemory({ schema });

    expect('batch' in store).toBe(false);
    expect('iterate' in store).toBe(false);
  });

  test('derived helpers work: has, count, isEmpty', async () => {
    const store = createMemory({ schema });

    expect(await isEmpty(store, 'users')).toBe(true);

    await store.put('users', { id: 1, name: 'Ada' });

    expect(await has(store, 'users', 1)).toBe(true);
    expect(await has(store, 'users', 99)).toBe(false);
    expect(await count(store, 'users')).toBe(1);
    expect(await isEmpty(store, 'users')).toBe(false);
  });
});
