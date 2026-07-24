# Change Log - @vielzeug/clockwork

This log was last generated on Fri, 24 Jul 2026 05:28:41 GMT and should not be manually modified.

## 1.1.1
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.1.0
Fri, 17 Jul 2026 14:17:07 GMT

### Minor changes

- feat: add hydrated-context validation option and snapshot-safe subscriptions

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

- fix(clockwork): scope invoke/after-timer restarts to exited paths, harden against prototype-key state/event names, fix stale MachineError docs

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(clockwork): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

