# Change Log - @vielzeug/pulse

This log was last generated on Sat, 15 Aug 2026 06:26:02 GMT and should not be manually modified.

## 2.1.2
Sat, 15 Aug 2026 06:26:02 GMT

_Version update only_

## 2.1.1
Mon, 10 Aug 2026 21:21:35 GMT

_Version update only_

## 2.1.0
Mon, 10 Aug 2026 15:11:23 GMT

### Minor changes

- feat: WebSocket lifecycle around explicit connection readiness and schema-bound scopes

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: align reactive channel state with Ripple signals

## 1.0.8
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- refactor(pulse): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

## 1.0.7
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.0.6
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix: resolve ripple from source in tests and externalize bundle dep
- feat: harden frame handling and memoize presence channels

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

- fix(pulse): correct channel/presence disposal-signal race, warn on silent drops, remove dead code

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(pulse): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

