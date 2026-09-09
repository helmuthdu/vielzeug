import { s } from '@vielzeug/spell';
import { describe, expect, test } from 'vitest';

import { table, VaultError, validatorCodec } from '../index';
import { createMemory } from '../memory';

type User = { id: number; name: string };

const schema = { users: table<User>('id') };

describe('VaultStore codecs', () => {
  test('supports transforming codecs without passing decoded values to decode()', async () => {
    type Event = { at: Date; id: number };
    const eventSchema = { events: table<Event>('id') };
    const store = createMemory({
      codecs: {
        events: {
          decode(value) {
            const encoded = value as { at: string; id: number };
            if (typeof encoded.at !== 'string') throw new Error('encoded date required');
            return { at: new Date(encoded.at), id: encoded.id };
          },
          encode: (value) => ({ at: value.at.toISOString(), id: value.id }),
        },
      },
      schema: eventSchema,
    });
    const at = new Date('2025-01-01T00:00:00.000Z');

    await store.put('events', { at, id: 1 });

    await expect(store.get('events', 1)).resolves.toEqual({ at, id: 1 });
  });

  test('returns canonical codec values from mutations', async () => {
    const store = createMemory({
      codecs: {
        users: {
          decode: (value) => {
            const user = value as User;
            return { ...user, name: user.name.trim() };
          },
          encode: (value) => value,
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
  });

  test('accepts Spell schemas directly as codecs', async () => {
    const store = createMemory({
      codecs: {
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
      codecs: {
        users: validatorCodec({
          parse(value) {
            const user = value as User;

            if (!user.name) throw new Error('name required');

            return user;
          },
        }),
      },
      schema,
    });

    await expect(store.put('users', { id: 1, name: '' })).rejects.toBeInstanceOf(VaultError);
    await expect(store.get('users', 1)).resolves.toBeUndefined();
  });
});
