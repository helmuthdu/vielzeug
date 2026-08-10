# Change Log - @vielzeug/ward

This log was last generated on Mon, 10 Aug 2026 15:11:23 GMT and should not be manually modified.

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- refactor!: remove middleware guards, validate createWard options, add anonymous-predicate development warning

## 1.0.6
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 1.0.5
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.0.4
Fri, 17 Jul 2026 14:17:07 GMT

### Patches

- fix: fail closed on async predicates
- fix: update ward behavior and docs

## 1.0.3
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.0.2
Sun, 05 Jul 2026 05:52:18 GMT

### Patches

- fix(ward): correct pervasive docs API drift (can/canAll/canAny, rule()/defineRules, Express/Hono guards never existed) and freeze detectConflicts() cache against mutation

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(ward): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

