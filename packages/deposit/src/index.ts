export { createIndexedDB } from './adapters/indexeddb';
export { createLocalStorage } from './adapters/localstorage';
export { QueryBuilder } from './query';
export { ttl } from './ttl';
export type {
  Adapter,
  IndexedDBHandle,
  IndexedDBOptions,
  KeyOf,
  LocalStorageOptions,
  MigrationContext,
  MigrationFn,
  RecordOf,
  Schema,
  SchemaEntry,
  TransactionContext,
} from './types';
