import { describe, expect, test, vi } from 'vitest';

import { table } from '../index';
import { createMemory } from '../memory';

type User = { id: number | string; name: string };

const schema = { users: table<User>('id') };

describe('Memory DocumentVaultStore', () => {
  test('supports portable string and number keys without collisions', async () => {
    const store = createMemory({ schema });

    await store.put('users', { id: 1, name: 'Ada' });
    await store.put('users', { id: '1', name: 'Grace' });

    expect(await store.count('users')).toBe(2);
    expect(await store.get('users', 1)).toEqual({ id: 1, name: 'Ada' });
    expect(await store.get('users', '1')).toEqual({ id: '1', name: 'Grace' });
  });

  test('batch() commits writes and notifies observers once per dirty table', async () => {
    const store = createMemory({ schema });
    const seen: number[] = [];
    store.observe('users', (records) => seen.push(records.length));

    await store.batch(['users'], async (tx) => {
      await tx.put('users', { id: 1, name: 'Ada' });
      await tx.put('users', { id: 2, name: 'Grace' });
    });

    expect(await store.count('users')).toBe(2);
    // The immediate snapshot sees 0; the batch commit notifies once with both records.
    await vi.waitFor(() => expect(seen).toEqual([0, 2]));
  });

  test('batch() restores the declared tables when the callback throws', async () => {
    const store = createMemory({ schema });
    await store.put('users', { id: 1, name: 'Ada' });

    await expect(
      store.batch(['users'], async (tx) => {
        await tx.delete('users', 1);
        await tx.put('users', { id: 2, name: 'Grace' });
        throw new Error('nope');
      }),
    ).rejects.toThrow('nope');

    expect(await store.get('users', 1)).toEqual({ id: 1, name: 'Ada' });
    expect(await store.get('users', 2)).toBeUndefined();
  });

  test('iterate() yields every live record', async () => {
    const store = createMemory({ schema });
    await store.putAll('users', [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
    ]);

    const names: string[] = [];
    for await (const user of store.iterate('users')) names.push(user.name);

    expect(names.sort()).toEqual(['Ada', 'Grace']);
  });

  test('derived store methods work: has, count, isEmpty', async () => {
    const store = createMemory({ schema });

    expect(await store.isEmpty('users')).toBe(true);

    await store.put('users', { id: 1, name: 'Ada' });

    expect(await store.has('users', 1)).toBe(true);
    expect(await store.has('users', 99)).toBe(false);
    expect(await store.count('users')).toBe(1);
    expect(await store.isEmpty('users')).toBe(false);
  });
});
