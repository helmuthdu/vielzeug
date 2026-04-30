import type { Adapter, AnySchema } from '../types';

import { WebStorageAdapter } from './webstorage';

/* -------------------- SessionStorageAdapter -------------------- */

// Thin wrapper — all logic lives in WebStorageAdapter.
class SessionStorageAdapter<S extends AnySchema> extends WebStorageAdapter<S> {
  constructor(dbName: string, schema: S) {
    super(dbName, schema, () => sessionStorage, 'sessionStorage');
  }
}

/* -------------------- Factory -------------------- */

export function createSessionStorage<S extends AnySchema>(options: { dbName: string; schema: S }): Adapter<S> {
  return new SessionStorageAdapter(options.dbName, options.schema);
}
