import { describe, expect, test } from 'vitest';

import { createMemory, table } from '../index';

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
