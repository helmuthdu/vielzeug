# Change Log - @vielzeug/forge

This log was last generated on Mon, 17 Aug 2026 10:42:29 GMT and should not be manually modified.

## 2.1.2
Mon, 17 Aug 2026 10:42:29 GMT

_Version update only_

## 2.1.1
Sun, 16 Aug 2026 09:15:40 GMT

_Version update only_

## 2.1.0
Sat, 15 Aug 2026 10:39:54 GMT

### Minor changes

- refactor: inline createStore into createForm; remove unused _utils.ts

## 2.0.2
Mon, 10 Aug 2026 15:11:23 GMT

_Version update only_

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: replace flat controller and Ripple runtime with explicit immutable forms, safe value constraints, and DOM, Spell customValidator, and Vault adapters

### Patches

- chore: accept asynchronous Spell schemas in the validator adapter

## 1.4.0
Sun, 26 Jul 2026 06:43:54 GMT

### Minor changes

- refactor(forge): move snapshot/restore to form.history, remove subscribeScoped()/validateStream(), merge values/validation into core/fields.ts with shared bulk-op primitives, extract core/notifier.ts, fix reset()/replace() dropping validator-only field state

### Patches

- refactor(forge): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

## 1.3.1
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

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

