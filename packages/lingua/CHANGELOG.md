# Change Log - @vielzeug/lingua

This log was last generated on Sun, 26 Jul 2026 06:43:54 GMT and should not be manually modified.

## 1.1.4
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- fix(lingua): warn in dev when t() is called on a plural-branch-only key (has() returns true but t() cannot resolve it), automatically run validateCatalog()'s CLDR plural-form checks whenever a catalog is registered/constructed/loaded (dev-only, lazily-chunked via dynamic import so it never enters production bundles), rename CatalogStore.catalogs/.pendingLoaders getters to snapshotCatalogs()/snapshotLoaders() methods for naming parity with NamespaceStore, remove 2 redundant type casts in fork(), and drop phantom [E0xx] labels from test names that referenced a non-existent error-code system

## 1.1.3
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.1.2
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix: harden namespace and subscription lifecycle behavior

## 1.1.1
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- fix(lingua): restore broken @vielzeug/lingua/validate subpath (vite entry-key/exports mismatch), throw LinguaNamespaceMissingError instead of a raw Error from loadNamespace(), wire up the documented ./format subpath, drop dead ssr.ts/testing.ts entries, dedupe has() logic, add exports smoke check

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(lingua): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

