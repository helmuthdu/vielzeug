import { describe, expect, test } from 'vitest';

import { table, ttl, VaultError } from '../index';
import { createObserverHub } from '../internal';
import { createMemory } from '../memory';

type Entry = { id: number | string; name: string };

const schema = { entries: table<Entry>('id') };

describe('portable KeyValueVaultStore features', () => {
  test('keeps numeric and string primary keys distinct', async () => {
    const store = createMemory({ schema });

    await store.putAll('entries', [
      { id: 1, name: 'number' },
      { id: '1', name: 'string' },
    ]);

    await expect(store.get('entries', 1)).resolves.toEqual({ id: 1, name: 'number' });
    await expect(store.get('entries', '1')).resolves.toEqual({ id: '1', name: 'string' });
  });

  test('discards observer reads superseded by newer notifications', async () => {
    const pending: Array<(records: Entry[]) => void> = [];
    const hub = createObserverHub<typeof schema>(
      () => new Promise((resolve) => pending.push(resolve as (records: Entry[]) => void)),
    );
    const snapshots: Entry[][] = [];
    hub.observe('entries', (entries) => snapshots.push(entries), { immediate: false });

    hub.notify('entries');
    hub.notify('entries');
    pending[1]?.([{ id: 2, name: 'new' }]);
    await Promise.resolve();
    pending[0]?.([{ id: 1, name: 'old' }]);
    await Promise.resolve();

    expect(snapshots).toEqual([[{ id: 2, name: 'new' }]]);
  });

  test('notifies observers after explicit TTL pruning', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const store = createMemory({ schema });
    const snapshots: Entry[][] = [];
    store.observe('entries', (entries) => snapshots.push(entries));
    await Promise.resolve();

    await store.put('entries', { id: 1, name: 'temporary' }, ttl.ms(10));
    await Promise.resolve();
    vi.advanceTimersByTime(10);
    await store.pruneExpired();
    await Promise.resolve();

    expect(snapshots.at(-1)).toEqual([]);
    vi.useRealTimers();
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
