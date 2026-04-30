import type { Adapter, AnySchema } from '../types';

import { WebStorageAdapter } from './webstorage';

/* -------------------- LocalStorageAdapter -------------------- */

// Thin wrapper — all logic lives in WebStorageAdapter.
class LocalStorageAdapter<S extends AnySchema> extends WebStorageAdapter<S> {
  constructor(dbName: string, schema: S) {
    super(dbName, schema, () => localStorage, 'localStorage');
  }
}

/* -------------------- Factory -------------------- */

export function createLocalStorage<S extends AnySchema>(options: { dbName: string; schema: S }): Adapter<S> {
  return new LocalStorageAdapter(options.dbName, options.schema);
}
