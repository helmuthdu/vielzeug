import { describe, expect, test } from 'vitest';

import { createMemory, table, VaultError } from '../index';

type User = { id: number; name: string };

const schema = { users: table<User>('id') };

describe('VaultStore validators', () => {
  test('validates records before storing them', async () => {
    const store = createMemory({
      schema,
      validators: {
        users: {
          parse(value) {
            const user = value as User;

            if (!user.name) throw new Error('name required');

            return user;
          },
        },
      },
    });

    await expect(store.put('users', { id: 1, name: '' })).rejects.toBeInstanceOf(VaultError);
    await expect(store.get('users', 1)).resolves.toBeUndefined();
  });
});
