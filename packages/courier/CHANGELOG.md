# Change Log - @vielzeug/courier

This log was last generated on Fri, 17 Jul 2026 14:17:07 GMT and should not be manually modified.

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

