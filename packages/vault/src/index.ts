export {
  count,
  deleteMany,
  getMany,
  has,
  isEmpty,
  keys,
  update,
  upsert,
} from './adapter-core';
export { VaultDisposedError, VaultError, VaultMigrationError, VaultQuotaError, VaultScopeError } from './errors';
export type { QueryBuilder } from './query';
export { isExpired, ttl } from './ttl';
export type {
  AnySchema,
  CodecInput,
  DocumentVaultStore,
  DurableStoreOptions,
  KeyOf,
  KeyValueVaultStore,
  MemoryStoreOptions,
  Observer,
  RecordCodec,
  RecordOf,
  RecordParser,
  SchemaEntry,
  TableCodecs,
  TransactionContext,
  Unsubscribe,
  VaultConveniences,
  VaultKey,
} from './types';
export { table, validatorCodec } from './types';
