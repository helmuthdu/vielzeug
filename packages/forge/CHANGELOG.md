# Change Log - @vielzeug/forge

This log was last generated on Fri, 17 Jul 2026 14:17:07 GMT and should not be manually modified.

## 1.3.0
Fri, 17 Jul 2026 14:17:07 GMT

### Minor changes

- feat: improve scoped adapter ergonomics and scoped path documentation

## 1.2.1
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.2.0
Tue, 07 Jul 2026 09:20:39 GMT

### Minor changes

- chore: update debugForm for cross-package devtools naming/shape consistency

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.1.2
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.1.1
Sun, 05 Jul 2026 05:52:18 GMT

_Version update only_

## 1.1.0
Fri, 03 Jul 2026 06:00:47 GMT

### Minor changes

- chore(forge): remove stale adapters — use subscribe()/connect() directly (see docs/forge/usage.md#framework-integration for migration recipes)
- feat(forge): decompose createForm() into cohesive internal modules, eliminate all as-unknown-as casts, add opt-in /devtools sub-path and fields.list() API; fix broken /validators export path

### Patches

- fix(forge): close prototype-pollution gaps, fix array/dispose-race bugs, dedupe async-queue/validator internals, expand test coverage and docs
- chore(forge): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

