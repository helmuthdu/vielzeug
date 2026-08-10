# Change Log - @vielzeug/flux

This log was last generated on Mon, 10 Aug 2026 21:21:35 GMT and should not be manually modified.

## 2.0.3
Mon, 10 Aug 2026 21:21:35 GMT

_Version update only_

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

- refactor!: redesign streams around returned teardowns, pipe(), explicit buffers, channels, adapter subpaths, and terminal consumer names

### Minor changes

- feat: adapt Courier adapters to AsyncIterable streams and query handles

### Patches

- fix: pipe operator type inference

## 1.0.8
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- refactor(flux): derive the @vielzeug/ripple portion of the vite external list from package.json via readWorkspaceDeps(), keeping the herald/pulse/courier optional-peer adapters explicit since they aren't regular dependencies

## 1.0.7
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.0.6
Fri, 17 Jul 2026 14:17:07 GMT

_Version update only_

## 1.0.5
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.0.4
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.0.3
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.0.2
Sun, 05 Jul 2026 05:52:18 GMT

### Patches

- harden flux operator error-forwarding, dedupe subject/pipe internals, fix withLatestFrom error swallow, add NaN/Infinity guard, cancellable toPromise/toArray

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(flux): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

