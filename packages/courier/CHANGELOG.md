# Change Log - @vielzeug/courier

This log was last generated on Sat, 15 Aug 2026 10:39:54 GMT and should not be manually modified.

## 2.1.0
Sat, 15 Aug 2026 10:39:54 GMT

### Minor changes

- refactor: widen invalidate() type to readonly unknown[]; remove res.text() fallback for broken fetch fakes

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- feat!: redesign Courier around one client, query handles, direct mutations, and AsyncIterable streams

### Minor changes

- refactor!: mutations start at status 'idle' (isLoading false; previously 'loading' — reset() and aborts also return to 'idle'); MutationOptions.onFinally removed (use onSettled); toSyncStore() removed (mutation.store and observe() are already SyncStore); qc.fetch() returns Promise<T | undefined>; readable()'s onError no longer suppresses terminal errors (notified, then always thrown — catch around the loop for partial-data-then-silence); initialData now seeds the cache even when enabled: false. Feature: queries accept a url source routed through the api client (createQuery({ api }), wired automatically by createCourier); observeMany() accepts select/placeholderData; fetchMany() accepts { settled: true }; error bodies always parse as JSON/text even with binary responseType; query cache GC uses a single retargeted timer

## 1.1.5
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- refactor(courier): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

## 1.1.4
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- fix: remove dead QueryClientOptions.fetch (never wired into query engine); split stream.ts into stream-shared/sse/readable modules
- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.1.3
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix: align loading baseline and disposed subscription behavior

## 1.1.2
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.1.1
Tue, 07 Jul 2026 09:20:39 GMT

_Version update only_

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- fix(courier): guard mutate() against disposed state, fix batcher sync-throw hang, dedupe retry/query helpers, add devtools sub-path and sync-store test coverage

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(courier): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

