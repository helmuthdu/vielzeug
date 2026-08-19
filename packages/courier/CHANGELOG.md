# Change Log - @vielzeug/courier

This log was last generated on Wed, 19 Aug 2026 06:57:36 GMT and should not be manually modified.

## 2.2.1
Wed, 19 Aug 2026 06:57:36 GMT

### Patches

- fix: query cache cancelAll() now clears entry.promise and entry.controller so a subsequent fetch() starts a fresh request instead of returning the stale rejected promise from the cancelled in-flight fetch; fetchEntry success/rejection handlers guard with entry.promise === promise so a superseded in-flight fetch cannot clobber a newer fetch's cache state
- fix: courier.dispose() no longer calls queries.clear() explicitly — transport.dispose() triggers the query cache disposal signal listener which sets the disposed flag then clears, avoiding a redundant double-clear and ensuring the disposed flag is set before clear runs
- refactor: remove duplicate StreamRuntimeConfig type from stream.ts — open() is now generic over P, accepting StreamOptions<P> directly and eliminating all unsafe casts
- refactor: remove unnecessary RequestInit cast in withLogging interceptor — ctx.init already includes method

## 2.2.0
Sun, 16 Aug 2026 09:15:39 GMT

### Minor changes

- feat: add mutate.invalidateKeys for one-step cache invalidation+refetch after successful writes; feat: add query cache garbage collection (query.gcTime, default 5 min, Infinity disables); feat: invalidate() accepts { refetch: true } to refetch matching entries in the background; feat: parseResponse returns undefined for empty/whitespace JSON bodies; refactor: unify StreamOptions with HttpRequestConfig (typed path params); fix: parseJson trims whitespace before JSON.parse to avoid SyntaxError on whitespace-only bodies; fix: invalidate() now schedules GC for invalidated entries with no subscribers; BREAKING: remove courier.request() from public instance (use get/post/put/patch/delete); BREAKING: remove queries.refetchStale() (use invalidate(prefix, { refetch: true })); BREAKING: rename courier.headers() to courier.setHeaders(); BREAKING: withLogging() requires explicit logger (no default console.debug); BREAKING: remove CourierError.is() static guard (use instanceof); BREAKING: QueryKeyAtom no longer accepts objects (string|number|boolean|null only); BREAKING: remove _dev.ts and @vielzeug/courier/devtools subpath; chore: remove hash re-export from serialize.ts

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

