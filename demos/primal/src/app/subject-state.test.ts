import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrimalStore } from './database';
import { hydratePrimalStore } from './subject-state';

/**
 * A stub whose table reads fail: attachAccount registers its observers, then rejects on the
 * first `isEmpty`, the earliest point a boot can fail after opening the database. The mock
 * routes the non-injected hydrate path (the real boot) onto the stub.
 */
const stubStore = (failure: Error): PrimalStore =>
  ({
    dispose: () => Promise.resolve(),
    getAll: () => Promise.resolve([]),
    isEmpty: () => Promise.reject(failure),
    observe: () => () => {},
  }) as unknown as PrimalStore;

/** The reset path's deleteDatabase request, satisfied on the next microtask. */
const deleteDatabaseRequest = () => {
  const request: { onsuccess?: () => void } = {};
  queueMicrotask(() => request.onsuccess?.());
  return request;
};

const database = vi.hoisted(() => ({ openPrimalStore: () => Promise.reject(new Error('unmocked')) }));

vi.mock('./database', () => ({
  openPrimalStore: () => database.openPrimalStore(),
  primalDatabaseName: () => 'primal:local',
  SETTINGS_ID: 'app',
}));

describe('hydratePrimalStore failure classification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the database when a boot failure is a storage race', async () => {
    const deleteDatabase = vi.fn(deleteDatabaseRequest);
    vi.stubGlobal('indexedDB', { deleteDatabase });
    database.openPrimalStore = () =>
      stubStore(
        new Error('transaction error on "primal:local/ascents"', {
          cause: new DOMException('The connection is closing.', 'InvalidStateError'),
        }),
      ) as unknown as ReturnType<typeof database.openPrimalStore>;

    await expect(hydratePrimalStore()).resolves.toBeUndefined();

    expect(deleteDatabase).not.toHaveBeenCalled();
  });

  it('keeps the database when a boot failure is a blocked open', async () => {
    const deleteDatabase = vi.fn(deleteDatabaseRequest);
    vi.stubGlobal('indexedDB', { deleteDatabase });
    database.openPrimalStore = () =>
      stubStore(new DOMException('The database is blocked.', 'BlockedError')) as unknown as ReturnType<
        typeof database.openPrimalStore
      >;

    await expect(hydratePrimalStore()).resolves.toBeUndefined();

    expect(deleteDatabase).not.toHaveBeenCalled();
  });

  it('resets the database when the records fail validation', async () => {
    const deleteDatabase = vi.fn(deleteDatabaseRequest);
    vi.stubGlobal('indexedDB', { deleteDatabase });
    database.openPrimalStore = () =>
      stubStore(
        new Error('validation failed for table "campaigns"', {
          cause: new Error('The record does not match the schema.'),
        }),
      ) as unknown as ReturnType<typeof database.openPrimalStore>;

    await expect(hydratePrimalStore()).resolves.toBeUndefined();

    expect(deleteDatabase).toHaveBeenCalledTimes(1);
  });
});
