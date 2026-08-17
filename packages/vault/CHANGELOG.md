# Change Log - @vielzeug/vault

This log was last generated on Mon, 17 Aug 2026 10:42:29 GMT and should not be manually modified.

## 2.3.0
Mon, 17 Aug 2026 10:42:29 GMT

### Minor changes

- refactor: simplify table() to options-object factory (replace .index().ttl() builder chain). Drop TtlMs branded type (ttl.* helpers return plain number). Merge totalCount() into count() (ignores limit/offset/orderBy). Simplify scheduleExpiredPrune (drop VaultDisposedError special-case, use shared assertPositiveFinite). Move MigrationContext, MigrationFn, MigrationStep, and defineMigration into @vielzeug/vault/indexeddb. Move TransactionContext out of root entry to /indexeddb and /sqlite subpaths. Simplify VaultLogger.error to message-first signature.

## 2.2.0
Sun, 16 Aug 2026 09:15:40 GMT

### Minor changes

- chore: remove VaultError.is() static type guard (use instanceof VaultError); remove dead wrapStored/unwrapStored/readWithTtl helpers from ttl.ts; remove dead devOnly from _dev.ts; export TransactionContext type from @vielzeug/vault/sqlite subpath (was only available from indexeddb subpath)

## 2.1.0
Mon, 10 Aug 2026 15:11:23 GMT

### Minor changes

- feat: add driver-neutral SQLite storage

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: redesign storage around portable keys, fixed envelopes, capability-specific stores, and observe()

## 1.0.4
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.0.3
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.0.2
Sun, 05 Jul 2026 05:52:18 GMT

### Patches

- fix(vault): correct IndexedDB keys() to exclude ad-hoc TTL-expired records; document custom-codec + secondary-index incompatibility

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(vault): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

