# Change Log - @vielzeug/sourcerer

This log was last generated on Sun, 26 Jul 2026 06:43:54 GMT and should not be manually modified.

## 1.1.0
Sun, 26 Jul 2026 06:43:54 GMT

### Minor changes

- refactor(sourcerer): add dev-diagnostics layer, rename SourceTimeoutError/SourceDisposedError to SourcererTimeoutError/SourcererDisposedError for consistency with the SourcererError base, remove applyQuery() (use source.patch() directly), add debugSource() devtools sub-path (works with mergeSource() too, which has no meta), localSource reuses the shared debounced-search coordinator, mergeSource/deriveSource auto-dispose once every parent disposes (routed through the public dispose() method), sanitize untrusted decodeQuery() input before logging it, dedupe clampPositiveInt's dev warning per call site. core.ts stays a plain Set-based pub/sub (no @vielzeug/ripple dependency) after finding a real SSR/concurrent-request risk in ripple's scheduler for prefetchSource()'s documented SSR use case

## 1.0.6
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.0.5
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix: align async search orchestration and stale optimistic refresh

## 1.0.4
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.0.3
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.0.2
Sun, 05 Jul 2026 05:52:18 GMT

### Patches

- fix(sourcerer): this-binding hazard breaks destructured methods, async filter/sort pipeline never ran on construction, immediate search()/patch() ignored a pending same-text debounce, LocalSource silently swallowed filterAsync/sortAsync errors

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(sourcerer): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

