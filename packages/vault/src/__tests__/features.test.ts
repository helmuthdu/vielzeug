import { describe, expect, test } from 'vitest';

import { table, ttl, VaultError } from '../index';
import { createMemory } from '../memory';

type Entry = { id: number | string; name: string };

const schema = { entries: table<Entry>('id') };

describe('portable VaultStore features', () => {
  test('keeps numeric and string primary keys distinct', async () => {
    const store = createMemory({ schema });

    await store.putAll('entries', [
      { id: 1, name: 'number' },
      { id: '1', name: 'string' },
    ]);

    await expect(store.get('entries', 1)).resolves.toEqual({ id: 1, name: 'number' });
    await expect(store.get('entries', '1')).resolves.toEqual({ id: '1', name: 'string' });
  });

  test('observes an initial and changed snapshot', async () => {
    const store = createMemory({ schema });
    const snapshots: Entry[][] = [];
    const stop = store.observe('entries', (entries) => snapshots.push(entries));

    await Promise.resolve();
    await store.put('entries', { id: 1, name: 'Ada' });
    await Promise.resolve();

    expect(snapshots).toEqual([[], [{ id: 1, name: 'Ada' }]]);
    stop();
  });
});

describe('table() options validation', () => {
  test('rejects duplicate index fields', () => {
    expect(() => table<Entry>('id', { indexes: ['name', 'name'] })).toThrow(VaultError);
    expect(() => table<Entry>('id', { indexes: ['name', 'name'] })).toThrow('already registered');
  });

  test('rejects non-positive defaultTtl', () => {
    expect(() => table<Entry>('id', { defaultTtl: 0 })).toThrow(VaultError);
    expect(() => table<Entry>('id', { defaultTtl: -1 })).toThrow(VaultError);
    expect(() => table<Entry>('id', { defaultTtl: Number.NaN })).toThrow(VaultError);
  });

  test('accepts valid options', () => {
    const t = table<Entry>('id', { defaultTtl: ttl.minutes(5), indexes: ['name'] });

    expect(t.key).toBe('id');
    expect(t.defaultTtl).toBe(ttl.minutes(5));
    expect(t.indexes).toEqual(['name']);
  });
});
