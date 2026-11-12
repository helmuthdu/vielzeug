import { s } from '@vielzeug/spell';
import { describe, expect, test, vi } from 'vitest';

import { table, VaultError } from '../index';
import { createMemory } from '../memory';

type User = { id: number; name: string };

const schema = { users: table<User>('id') };

describe('record parsers', () => {
  test('returns canonical parser values from mutations', async () => {
    const store = createMemory({
      parsers: {
        users: {
          parse: (value) => {
            const user = value as User;
            return { ...user, name: user.name.trim() };
          },
        },
      },
      schema,
    });

    await expect(store.put('users', { id: 1, name: '  Ada  ' })).resolves.toEqual({ id: 1, name: 'Ada' });
    await expect(store.update('users', 1, { name: '  Grace  ' })).resolves.toEqual({ id: 1, name: 'Grace' });
    await expect(store.upsert('users', 2, () => ({ id: 2, name: '  Lin  ' }))).resolves.toEqual({
      id: 2,
      name: 'Lin',
    });
    await expect(store.get('users', 1)).resolves.toEqual({ id: 1, name: 'Grace' });
  });

  test('accepts Spell schemas directly as parsers', async () => {
    const store = createMemory({
      parsers: {
        users: s.object({ id: s.number(), name: s.string().min(1) }),
      },
      schema,
    });

    await store.put('users', { id: 1, name: 'Ada' });
    await expect(store.get('users', 1)).resolves.toEqual({ id: 1, name: 'Ada' });
    await expect(store.put('users', { id: 2, name: '' })).rejects.toThrow('validation failed');
  });

  test('validates records before storing them', async () => {
    const store = createMemory({
      parsers: {
        users: {
          parse(value) {
            const user = value as User;

            if (!user.name) throw new Error('name required');

            return user;
          },
        },
      },
      schema,
    });

    await expect(store.put('users', { id: 1, name: '' })).rejects.toBeInstanceOf(VaultError);
    await expect(store.get('users', 1)).resolves.toBeUndefined();
  });

  test('reports observer listener errors through onObserverError', async () => {
    const errors: unknown[] = [];
    const store = createMemory({ onObserverError: (error) => errors.push(error), schema });
    store.observe(
      'users',
      () => {
        throw new Error('listener exploded');
      },
      { immediate: false },
    );

    await store.put('users', { id: 1, name: 'Ada' });

    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0]).toBeInstanceOf(Error);
  });

  test('keeps observer snapshots flowing when a listener throws without a handler', async () => {
    const store = createMemory({ schema });
    const seen: unknown[][] = [];
    store.observe('users', () => {
      throw new Error('listener exploded');
    });
    store.observe('users', (records) => seen.push(records));

    await store.put('users', { id: 1, name: 'Ada' });

    await vi.waitFor(() => expect(seen.length).toBeGreaterThan(1));
    expect(seen.at(-1)).toEqual([{ id: 1, name: 'Ada' }]);
  });
});
