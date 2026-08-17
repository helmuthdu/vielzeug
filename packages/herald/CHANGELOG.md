# Change Log - @vielzeug/herald

This log was last generated on Mon, 17 Aug 2026 10:42:29 GMT and should not be manually modified.

## 2.1.0
Mon, 17 Aug 2026 10:42:29 GMT

### Minor changes

- refactor: fix InternalBusOptions leak — split createBus into public createBus(BusOptions) and @internal createBusInternal(InternalBusOptions). Remove HeraldError.is() type guard (use instanceof). Fix maxBuffer JSDoc to document HeraldConfigError instead of RangeError. Inline _prototype.ts isUnsafeObjectKey into testing/testing.ts and delete _prototype.ts. Update REPL error-handling example to use instanceof.

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- refactor!: simplify event bus and remove retained-state APIs

## 1.0.6
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 1.0.5
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- fix(herald): remove dead @vielzeug/arsenal vite external — no longer imported and never declared as a dependency; derive the (now empty) external list via readWorkspaceDeps() instead of a hand-listed array

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

- fix(herald): run every listener for an emission even without onError; fix __proto__ key hijacking snapshot()/allEmitted() results; dedupe safe-call helper; drop stray duplicate testing.test.ts and dead exports

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(herald): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

