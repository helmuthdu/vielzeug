import type { Adapter, AnySchema } from '../types';

import { WebStorageAdapter } from './webstorage';

export function createLocalStorage<S extends AnySchema>(options: { dbName: string; schema: S }): Adapter<S> {
  return new WebStorageAdapter(options.dbName, options.schema, () => localStorage, 'localStorage');
}
