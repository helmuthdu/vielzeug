import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';

import { table } from '../src/index.ts';
import { createSQLite } from '../src/sqlite.ts';

test('persists a typed record through bun:sqlite', async () => {
  const database = new Database(':memory:');
  const store = createSQLite({
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
