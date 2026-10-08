# Change Log - @vielzeug/conduit

This log was last generated on Thu, 08 Oct 2026 07:48:38 GMT and should not be manually modified.

## 26.10.5
Thu, 08 Oct 2026 07:48:38 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 26.10.1
Wed, 07 Oct 2026 07:25:55 GMT

### Patches

- Standardize package text punctuation
## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Minor changes

- feat: replace scope()/ScopeToken with createChild containers and AnyProvider
## 3.0.0
Wed, 09 Sep 2026 22:15:14 GMT

### Breaking changes

- refactor!: adopt immutable provider graphs with typed builders while preserving direct, transient, scoped, and deterministic lifecycle workflows

## 2.1.1
Sun, 30 Aug 2026 13:16:08 GMT

### Patches

- fix: widen Disposer value type from never to unknown for correct cleanup semantics.

## 2.1.0
Wed, 26 Aug 2026 17:29:55 GMT

### Minor changes

- feat: remove static is() type guard from base error class; add sideEffects: false for tree-shaking.

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- Redesign Conduit around dependency-first async factories

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

- fix(conduit): widespread unprefixed error-class names and stale API references (createChild, 'scoped' lifetime, AggregateError) across docs and README; drop unused _dev.ts helpers; add resolveAll() concurrent-cycle regression test

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(conduit): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

