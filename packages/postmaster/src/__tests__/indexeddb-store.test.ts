import { createIndexedDbPostmasterStore } from '../indexeddb.ts';
import type { StoredJob } from '../store.ts';
import { describePostmasterStore } from './store-contract.ts';

const entry = (id: string): StoredJob => ({
  attempts: 0,
  availableAt: 0,
  createdAt: 0,
  id,
  key: id,
  name: 'send',
  payload: { id },
  status: 'queued',
  updatedAt: 0,
  version: 1,
});

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function corruptRecord(
  name: string,
  id: string,
  mutate: (value: Record<string, unknown>) => void,
): Promise<void> {
  const database = await openDatabase(name);
  const transaction = database.transaction('jobs', 'readwrite');
  const store = transaction.objectStore('jobs');

  await new Promise<void>((resolve, reject) => {
    const request = store.openCursor();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return reject(new Error(`record "${id}" was not found`));
      const stored = cursor.value as { value?: Record<string, unknown> };
      if (stored.value?.id !== id) {
        cursor.continue();
        return;
      }
      mutate(stored.value);
      const update = cursor.update(stored);
      update.onsuccess = () => resolve();
      update.onerror = () => reject(update.error);
    };
  });

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}

describe('IndexedDB persisted-record boundary', () => {
  it('rejects invalid records before persistence', async () => {
    const store = createIndexedDbPostmasterStore({ name: `postmaster-write-${crypto.randomUUID()}` });

    await expect(store.transact((tx) => tx.put({ ...entry('bad'), attempts: -1 }))).rejects.toThrow(
      'executing transaction failed',
    );
    await expect(store.list()).resolves.toEqual([]);
    await store.dispose();
  });

  it('skips and reports a corrupt record without blocking valid jobs', async () => {
    const name = `postmaster-corrupt-${crypto.randomUUID()}`;
    const onCorruptRecord = vi.fn();
    const store = createIndexedDbPostmasterStore({ name, onCorruptRecord });
    await store.transact(async (tx) => {
      await tx.put(entry('bad'));
      await tx.put(entry('good'));
    });
    await corruptRecord(name, 'bad', (value) => {
      value.attempts = 'invalid';
    });

    await expect(store.list()).resolves.toMatchObject([{ id: 'good' }]);
    await expect(store.transact((tx) => tx.findClaimable(0))).resolves.toMatchObject({ id: 'good' });
    expect(onCorruptRecord).toHaveBeenCalledOnce();
    expect(onCorruptRecord).toHaveBeenCalledWith({
      id: 'bad',
      reason: 'invalid stored job: attempts must be a non-negative integer',
    });
    await store.dispose();
  });

  it('reports operationally invalid persisted values', async () => {
    const name = `postmaster-invalid-${crypto.randomUUID()}`;
    const onCorruptRecord = vi.fn();
    const store = createIndexedDbPostmasterStore({ name, onCorruptRecord });
    await store.transact((tx) => tx.put(entry('bad')));
    await corruptRecord(name, 'bad', (value) => {
      value.version = 1.5;
    });

    await expect(store.list()).resolves.toEqual([]);
    expect(onCorruptRecord).toHaveBeenCalledWith({
      id: 'bad',
      reason: 'invalid stored job: version must be a positive integer',
    });
    await store.dispose();
  });
});

describePostmasterStore('IndexedDB Postmaster store', {
  create: () => Promise.resolve(createIndexedDbPostmasterStore({ name: `postmaster-test-${crypto.randomUUID()}` })),
});
