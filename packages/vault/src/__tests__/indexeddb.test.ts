import { describe, expect, test } from 'vitest';

import { table, validatorCodec } from '../index';
import { createIndexedDB } from '../indexeddb';

type User = { id: number | string; name: string };

const schema = { users: table<User>('id', { indexes: ['name'] }) };
const codecs = { users: validatorCodec({ parse: (v) => v as User }) };

describe('IndexedDB DocumentVaultStore', () => {
  test('provides atomic batch transactions and cursor iteration', async () => {
    const db = createIndexedDB({ codecs, name: `vault-test-${crypto.randomUUID()}`, schema });

    await db.batch(['users'], async (tx) => {
      await tx.put('users', { id: 1, name: 'Ada' });
      await tx.put('users', { id: '1', name: 'Grace' });
    });

    expect(
      await db.batch(['users'], async (tx) => {
        const results: (User | undefined)[] = [];

        for await (const user of tx.iterate('users')) results.push(user);

        return results;
      }),
    ).toHaveLength(2);

    const names: string[] = [];

    for await (const user of db.iterate('users')) names.push(user.name);

    expect(names.sort()).toEqual(['Ada', 'Grace']);
    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Ada' });
    expect(await db.get('users', '1')).toEqual({ id: '1', name: 'Grace' });
    await db.dispose();
  });

  test('does not drop records when cursor consumers pause', async () => {
    const db = createIndexedDB({ codecs, name: `vault-test-${crypto.randomUUID()}`, schema });
    await db.putAll(
      'users',
      Array.from({ length: 5 }, (_, id) => ({ id, name: `User ${String(id)}` })),
    );
    const iterator = db.iterate('users')[Symbol.asyncIterator]();
    const records = [(await iterator.next()).value];

    await new Promise((resolve) => setTimeout(resolve, 20));

    for (let next = await iterator.next(); !next.done; next = await iterator.next()) records.push(next.value);

    expect(records.map((record) => record?.id)).toEqual([0, 1, 2, 3, 4]);
    await db.dispose();
  });

  test('queries declared indexes without scanning the full table', async () => {
    const db = createIndexedDB({ codecs, name: `vault-test-${crypto.randomUUID()}`, schema });

    await db.putAll('users', [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
      { id: 3, name: 'Ada' },
    ]);

    await expect(db.getAllByIndex('users', 'name', 'Ada')).resolves.toEqual([
      { id: 1, name: 'Ada' },
      { id: 3, name: 'Ada' },
    ]);
    await expect(db.getAllByIndex('users', 'id', 1)).rejects.toThrow('has no index');
    await db.dispose();
  });

  test('rejects cursor iteration when a codec cannot decode a stored record', async () => {
    let rejectDecode = false;
    const strict = createIndexedDB({
      codecs: {
        users: {
          decode(value) {
            if (rejectDecode) throw new Error('decode failed');
            return value as User;
          },
          encode: (value) => value,
        },
      },
      name: `vault-test-${crypto.randomUUID()}`,
      schema,
    });
    await strict.put('users', { id: 1, name: 'Ada' });
    rejectDecode = true;

    await expect(strict.iterate('users')[Symbol.asyncIterator]().next()).rejects.toThrow('validation failed');
    await strict.dispose();
  });

  test('rejects codecs that do not preserve declared index fields', async () => {
    const transformed = createIndexedDB({
      codecs: {
        users: {
          decode(value) {
            const record = value as { id: number | string; n?: string; name?: string };
            return { id: record.id, name: record.name ?? record.n ?? '' };
          },
          encode: (value) => ({ id: value.id, n: value.name }),
        },
      },
      name: `vault-test-${crypto.randomUUID()}`,
      schema,
    });

    await expect(transformed.put('users', { id: 1, name: 'Ada' })).rejects.toThrow('indexed field');
    await transformed.dispose();
  });

  test('rejects empty batch scopes before opening an IndexedDB transaction', async () => {
    const db = createIndexedDB({ codecs, name: `vault-test-${crypto.randomUUID()}`, schema });

    await expect(db.batch([], async () => undefined)).rejects.toThrow('declare at least one table');
    await db.dispose();
  });

  test('requires codecs for durable persistence', () => {
    expect(() => createIndexedDB({ name: 'should-fail', schema } as never)).toThrow('codecs are required');
  });
});
