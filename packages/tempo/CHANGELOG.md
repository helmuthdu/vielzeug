# Change Log - @vielzeug/tempo

This log was last generated on Mon, 17 Aug 2026 10:42:29 GMT and should not be manually modified.

## 2.1.0
Mon, 17 Aug 2026 10:42:29 GMT

### Minor changes

- refactor: remove TempoError.is() type guard (use instanceof). Fix formatZoned and formatInstant JSDoc to accurately document timeZone requirements and @throws clauses. Fix _floor.ts weekStartsOn type to use WeekStartDay instead of number. Move normalizeRange from _tz.ts to compare.ts (only consumer). Add tests for 12 previously untested functions: isValid, startOf, endOf, formatRange, formatRangeParts, formatZoned, formatRelative, formatParts, parseDuration, formatDuration, humanize, timeDiff.

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- refactor!: redesign Tempo parsing, timezone semantics, range inputs, and expiry classification

## 1.0.6
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 1.0.5
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- refactor(tempo): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

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

- fix: sync README/docs/REPL example with actual error hierarchy, drop dead _dev.ts and arsenal build config

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(tempo): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

