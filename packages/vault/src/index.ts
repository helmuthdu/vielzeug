export { VaultDisposedError, VaultError, VaultMigrationError, VaultQuotaError, VaultScopeError } from './errors';
export { scheduleExpiredPrune } from './prune';
export type { QueryBuilder } from './query';
export { isExpired, ttl } from './ttl';
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
  TableValidators,
  TransactionalVaultStore,
  Unsubscribe,
  VaultKey,
  VaultLogger,
  VaultStore,
} from './types';
export { table } from './types';
