# Change Log - @vielzeug/arsenal

This log was last generated on Wed, 07 Oct 2026 11:33:21 GMT and should not be manually modified.

## 26.10.3
Wed, 07 Oct 2026 11:33:21 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.2
Wed, 07 Oct 2026 10:50:06 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.1
Wed, 07 Oct 2026 07:25:55 GMT

### Patches

- Standardize package text punctuation
- Clarify assertion and array example documentation
## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- feat: add tapper and shared Subscribable/Unsubscribe types
- Expose taskPool, waitFor, cache, and memo from the root barrel
- Add encoding/base64url: environment-independent base64url text and byte codecs
## 3.0.0
Wed, 09 Sep 2026 22:15:14 GMT

### Breaking changes

- refactor!: consolidate reusable random primitives, narrow obsolete utility exports, and expose live cache entry snapshots

## 2.1.0
Sun, 16 Aug 2026 09:15:39 GMT

### Minor changes

- refactor: remove ArsenalError.is() type guard; use instanceof ArsenalError. Export abortable from async subpath. Remove side effect from cache.size getter. Simplify backoff to 2 ** n. Replace Reflect.apply in pipe with direct call.

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- Redesign Arsenal around focused category entry points

## 1.1.2
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.1.1
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- feat(arsenal): harden prototype-pollution guards, fix concurrency/caching edge cases, add error subclass hierarchy, and reorganize random utilities

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(arsenal): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

