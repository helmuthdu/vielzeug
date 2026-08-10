# Change Log - @vielzeug/rune

This log was last generated on Mon, 10 Aug 2026 15:11:23 GMT and should not be manually modified.

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- refactor!: make batch lifecycle awaitable and remove RuneTransportError

## 1.1.3
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 1.1.2
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.1.1
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- fix(rune): patch Node console format-string injection (log forging via namespace) and __proto__ bracket-assignment prototype hijack (serializeErrors/redactObject/resolveBindings); stop entry.data aliasing internal bindings, serialize Error values in pinned bindings (not just per-call context), isolate transport/middleware failures in dispatch() using RuneTransportError, export PRIORITY, fix README Rune/sample drift, drop unused devOnly()

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(rune): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

