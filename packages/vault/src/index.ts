export { createIndexedDB } from './adapters/indexeddb';
export type { IndexedDbAdapter } from './adapters/indexeddb';
export { createMemory } from './adapters/memory';
export { createLocalStorage, createSessionStorage } from './adapters/webstorage';
export {
  VaultDisposedError,
  VaultError,
  VaultMigrationError,
  VaultQuotaError,
  VaultScopeError,
} from './errors';
export type { QueryBuilder, ReadQuery } from './query';
export { scheduleExpiredPrune } from './prune';
export { ttl } from './ttl';
export { table } from './types';
export type {
  Adapter,
  AnySchema,
  BaseAdapterOptions,
  DebugInfo,
  DebugStats,
  VaultLogger,
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
} from './types';
