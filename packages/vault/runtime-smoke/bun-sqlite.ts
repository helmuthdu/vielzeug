import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';

import { table } from '../src/index.ts';
import { createSQLite } from '../src/sqlite.ts';

type User = { id: number; name: string };
const parseUser = (value: unknown): User => {
  if (typeof value !== 'object' || value === null) throw new Error('invalid user');
  const user = value as Record<string, unknown>;
  if (typeof user.id !== 'number' || typeof user.name !== 'string') throw new Error('invalid user');
  return { id: user.id, name: user.name };
};

test('persists a typed record through bun:sqlite', async () => {
  const database = new Database(':memory:');
  const store = createSQLite({
    codecs: { users: { parse: parseUser } },
    database,
    name: 'bun-smoke',
    schema: { users: table<{ id: number; name: string }>('id') },
  });

  try {
    await store.put('users', { id: 1, name: 'Ada' });
    await expect(store.get('users', 1)).resolves.toEqual({ id: 1, name: 'Ada' });
  } finally {
    await store.dispose();
    database.close();
  }
});
