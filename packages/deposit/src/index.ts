export { createIndexedDB } from './adapters/indexeddb';
export { createLocalStorage } from './adapters/localstorage';
export { ProjectedQuery, QueryBuilder } from './query';
export { defineSchema, storeField } from './schema';
export { ttl } from './ttl';
export type {
  Adapter,
  IndexedDBHandle,
  IndexedDBOptions,
  KeyOf,
  LocalStorageOptions,
  MigrationFn,
  RecordOf,
  Schema,
  SchemaEntry,
  TransactionContext,
} from './types';
