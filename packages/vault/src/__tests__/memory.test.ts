import { describe, expect, test } from 'vitest';

import { createMemory, table } from '../index';

type User = { id: number | string; name: string };

const schema = { users: table<User>('id') };

describe('Memory VaultStore', () => {
  test('supports portable string and number keys without collisions', async () => {
    const store = createMemory({ schema });

    await store.put('users', { id: 1, name: 'Ada' });
    await store.put('users', { id: '1', name: 'Grace' });

    expect(await store.count('users')).toBe(2);
    expect(await store.get('users', 1)).toEqual({ id: 1, name: 'Ada' });
    expect(await store.get('users', '1')).toEqual({ id: '1', name: 'Grace' });
  });

  test('does not expose IndexedDB-only transactions or iteration', () => {
    const store = createMemory({ schema });

    expect('batch' in store).toBe(false);
    expect('iterate' in store).toBe(false);
  });
});
