import { describe, expect, test } from 'vitest';

import { createIndexedDB, table } from '../index';

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
});
