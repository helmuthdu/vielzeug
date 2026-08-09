export { VaultDisposedError, VaultError, VaultMigrationError, VaultQuotaError, VaultScopeError } from './errors';
export type { QueryBuilder } from './query';
export { scheduleExpiredPrune } from './prune';
export { isExpired, ttl } from './ttl';
export { table } from './types';
export type {
  AnySchema,
  BaseAdapterOptions,
  DebugInfo,
  DebugStats,
  IterableVaultStore,
  KeyOf,
  MetricsEvent,
  Observer,
  RecordOf,
  RecordValidator,
  SchemaEntry,
  TableBuilder,
  TableValidators,
  TransactionalVaultStore,
  TtlMs,
  Unsubscribe,
  VaultKey,
  VaultLogger,
  VaultStore,
} from './types';
