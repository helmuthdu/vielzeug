# Change Log - @vielzeug/lingua

This log was last generated on Wed, 21 Oct 2026 07:30:45 GMT and should not be manually modified.

## 26.10.16
Wed, 21 Oct 2026 07:30:45 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.15
Mon, 19 Oct 2026 10:13:34 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.14
Sun, 18 Oct 2026 09:46:30 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.13
Sat, 17 Oct 2026 06:46:08 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.12
Sat, 17 Oct 2026 05:06:33 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.11
Thu, 15 Oct 2026 13:45:48 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.10
Thu, 15 Oct 2026 05:00:39 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.9
Wed, 14 Oct 2026 21:26:14 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.8
Tue, 13 Oct 2026 07:49:18 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.7
Mon, 12 Oct 2026 20:24:11 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.6
Mon, 12 Oct 2026 18:44:06 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.5
Thu, 08 Oct 2026 07:48:38 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.1
Wed, 07 Oct 2026 07:25:55 GMT

### Patches

- Standardize package text punctuation
## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- Greenfield refactor: catalogKeys is catalog-only (no I18n overload), unserializable formatter options bypass the cache, shared isDev flag, TranslationState version reset to 1
- Add /ripple createReactiveI18n binding translations to ripple signals
## 3.0.0
Wed, 09 Sep 2026 22:15:14 GMT

### Breaking changes

- refactor: simplify localization around eager catalogs, atomic locale loading, typed parts, and unified missing-message handling

## 2.4.1
Sun, 30 Aug 2026 13:16:08 GMT

### Patches

- refactor: remove unused devOnly helper from _dev.ts

## 2.4.0
Wed, 26 Aug 2026 17:29:55 GMT

### Minor changes

- feat: remove static is() type guard from base error class; add sideEffects: false for tree-shaking.

## 2.3.0
Wed, 19 Aug 2026 06:57:36 GMT

### Minor changes

- feat: add catalogKeys(source) runtime utility that enumerates every message key as a dotted path: accepts a TranslationStore (reads current locale catalog) or a raw catalog object; traverses nested grouping objects and explicit plural messages, returning ReadonlyArray<TextKey<C>> so consumers can derive key arrays without maintaining stale parallel lists; calling on a nested subtree returns group-scoped keys without filtering
- feat: add compareCatalogs(catalogs) to /validate subpath: compares key parity across locales, reporting missing and extra keys relative to the first locale as base; catches the most common i18n defect of incomplete translations

### Patches

- refactor: deduplicate MessageKey, TextKey, and PluralKey recursive types into a single generic CatalogPaths<C, Leaf> helper: same type-level behavior, one source of truth for traversal logic
- refactor: export isPluralMessage from _catalog.ts and reuse in validate.ts: removes duplicated type guard

## 2.2.0
Sat, 15 Aug 2026 10:39:54 GMT

### Minor changes

- refactor: remove redundant LoadedCatalogs type alias (use Catalogs directly); document Translator, MessageKey, TextKey, PluralKey types in api.md

## 2.1.0
Wed, 05 Aug 2026 19:50:19 GMT

### Minor changes

- feat: add single-catalog translators and harden package resolution

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: redesign localization around explicit locale catalogs. Replaces createI18n()/hydrateI18n() with createTranslationStore()/hydrateTranslationStore(), resources with catalogs, and I18n state version 2 with TranslationState version 3. Removes namespace/resource APIs and LinguaMissingResourceError. Use createTranslator() for fixed-locale translation.

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

