export { createIndexedDB } from './adapters/indexeddb';
export type { IndexedDbAdapter } from './adapters/indexeddb';
export { createMemory } from './adapters/memory';
export { createLocalStorage, createSessionStorage } from './adapters/webstorage';
export type { BatchDeps, BatchImpl, StorageBackend } from './adapter-core';
export { VaultDisposedError, VaultError, VaultMigrationError, VaultQuotaError, VaultScopeError } from './errors';
export { defineMigration } from './migration';
export type { MigrationStep } from './migration';
export type { QueryBuilder } from './query';
export { scheduleExpiredPrune } from './prune';
export { ttl } from './ttl';
export { table } from './types';
export type {
  Adapter,
  AnySchema,
  BaseAdapterOptions,
  DebugInfo,
  DebugStats,
  KeyOf,
  MetricsEvent,
  MigrationContext,
  MigrationFn,
  Observer,
  ReactiveSignal,
  RecordOf,
  RecordValidator,
  SchemaEntry,
  TableSignals,
  TableValidators,
  TransactionContext,
  TtlMs,
  Unsubscribe,
  VaultCodec,
  VaultLogger,
} from './types';
