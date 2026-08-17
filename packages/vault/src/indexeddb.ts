export type {
  IndexedDbVaultStore,
  MigrationContext,
  MigrationFn,
  MigrationStep,
} from './adapters/indexeddb';
export { createIndexedDB, defineMigration } from './adapters/indexeddb';
export type { TransactionContext } from './types';
