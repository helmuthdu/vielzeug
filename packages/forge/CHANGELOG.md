# Change Log - @vielzeug/forge

This log was last generated on Fri, 03 Jul 2026 06:00:47 GMT and should not be manually modified.

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

