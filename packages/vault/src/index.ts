export { VaultDisposedError, VaultError, VaultMigrationError, VaultQuotaError, VaultScopeError } from './errors';
export type { QueryBuilder } from './query';
export { isExpired, ttl } from './ttl';
export type {
  AnySchema,
  BaseAdapterOptions,
  KeyOf,
  Observer,
  RecordOf,
  RecordValidator,
  SchemaEntry,
  TableValidators,
  TransactionalVaultStore,
  Unsubscribe,
  VaultKey,
  VaultStore,
} from './types';
export { table } from './types';
