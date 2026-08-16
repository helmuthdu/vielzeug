# Change Log - @vielzeug/arsenal

This log was last generated on Sun, 16 Aug 2026 09:15:39 GMT and should not be manually modified.

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

