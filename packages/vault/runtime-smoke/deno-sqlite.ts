import { Database } from 'jsr:@db/sqlite';

import { table } from '../src/index.ts';
import { createSQLite } from '../src/sqlite.ts';

Deno.test('persists a typed record through @db/sqlite', async () => {
  const database = new Database(':memory:');
  const store = createSQLite({
    database,
    name: 'deno-smoke',
    schema: { users: table<{ id: number; name: string }>('id') },
  });

  try {
    await store.put('users', { id: 1, name: 'Ada' });

    const user = await store.get('users', 1);

    if (user?.name !== 'Ada') throw new Error('SQLite record was not persisted');
  } finally {
    await store.dispose();
    database.close();
  }
});
