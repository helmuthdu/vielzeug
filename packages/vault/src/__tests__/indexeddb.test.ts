import { describe, expect, test } from 'vitest';

import { table } from '../index';
import { createIndexedDB } from '../indexeddb';

type User = { id: number | string; name: string };

const schema = { users: table<User>('id') };

describe('IndexedDbVaultStore', () => {
  test('provides atomic batch transactions and cursor iteration', async () => {
    const db = createIndexedDB({ name: `vault-test-${crypto.randomUUID()}`, schema });

    await db.batch(['users'], async (tx) => {
      await tx.put('users', { id: 1, name: 'Ada' });
      await tx.put('users', { id: '1', name: 'Grace' });
    });

    expect(await db.batch(['users'], (tx) => tx.getMany('users', ['1', 1]))).toEqual([
      { id: '1', name: 'Grace' },
      { id: 1, name: 'Ada' },
    ]);

    const names: string[] = [];

    for await (const user of db.iterate('users')) names.push(user.name);

    expect(names.sort()).toEqual(['Ada', 'Grace']);
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Ada' });
    expect(await db.get('users', '1')).toEqual({ id: '1', name: 'Grace' });
    expect(await db.getMany('users', ['1', 1])).toEqual([
      { id: '1', name: 'Grace' },
      { id: 1, name: 'Ada' },
    ]);
    await db.dispose();
  });

  test('rejects empty batch scopes before opening an IndexedDB transaction', async () => {
    const db = createIndexedDB({ name: `vault-test-${crypto.randomUUID()}`, schema });

    await expect(db.batch([], async () => undefined)).rejects.toThrow('declare at least one table');
    await db.dispose();
  });
});
