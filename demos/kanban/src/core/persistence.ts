import { hydrateQueryCache, persistQueryCache } from '@vielzeug/courier';
import { createIndexedDB, table } from '@vielzeug/vault';

import type { Task } from './types';

import { courier } from './api';

// ---------------------------------------------------------------------------
// Vault schema
// ---------------------------------------------------------------------------

const tasksTable = table<Task>('id').index('status');

export const adapter = createIndexedDB({
  name: 'kanban-db',
  schema: { tasks: tasksTable },
  version: 1,
});

// ---------------------------------------------------------------------------
// PersistStorage shim — Map-backed glue between vault and courier
// ---------------------------------------------------------------------------

const cache = new Map<string, string>();

export const persistStorage = {
  getItem: async (key: string): Promise<string | null> => cache.get(key) ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    cache.set(key, value);
  },
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export async function setupPersistence(): Promise<void> {
  await hydrateQueryCache(courier.query, { keys: () => true, storage: persistStorage });
  persistQueryCache(courier.query, { keys: () => true, storage: persistStorage });
}
