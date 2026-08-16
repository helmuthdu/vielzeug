# Change Log - @vielzeug/ripple

This log was last generated on Sun, 16 Aug 2026 09:15:39 GMT and should not be manually modified.

## 2.2.1
Sun, 16 Aug 2026 09:15:39 GMT

### Patches

- fix: recognize Signals, computed values, and Resources across duplicate Ripple module graphs

## 2.2.0
Sat, 15 Aug 2026 06:26:02 GMT

### Minor changes

- refactor: collapse subpaths to root export, remove Store primitive (signal.update replaces it), simplify Resource disposal, remove dead isSignal/isComputed

## 2.1.0
Mon, 10 Aug 2026 21:21:35 GMT

### Minor changes

- refactor: make isolated graph disposal terminal — writes, subscriptions, graph factories, and batch/untrack now throw RippleDisposedRuntimeError after dispose; Ripple exposes disposed

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: redesign reactive runtime and public API

### Minor changes

- fix: fix sub-path export packaging, add disposalSignal lifecycle contract, deep-freeze store state, redesign SSR provider API, compile-time lens path validation

## 1.3.0
Sun, 26 Jul 2026 06:43:54 GMT

### Minor changes

- refactor(ripple): move storeWithHistory to /history sub-path; tighten readonly()/resource() typing

## 1.2.3
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.2.2
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix(ripple): correct disposed state for top-level store lenses

## 1.2.1
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines
- docs: align devtools.ts header comment style with the rest of the ecosystem

## 1.2.0
Sun, 05 Jul 2026 06:22:27 GMT

### Minor changes

- feat(ripple): store.replace()/reset() now remove omitted keys instead of nulling them, add resource().refresh() for manual refetch

## 1.1.0
Fri, 03 Jul 2026 06:00:47 GMT

### Minor changes

- feat(ripple): fix store patch/replace atomicity, resource() auto-dispose, SSR scheduling isolation, and add watch() multi-source support

### Patches

- chore(ripple): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

