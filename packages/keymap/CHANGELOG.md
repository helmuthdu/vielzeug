# Change Log - @vielzeug/keymap

This log was last generated on Mon, 17 Aug 2026 10:42:29 GMT and should not be manually modified.

## 2.1.0
Mon, 17 Aug 2026 10:42:29 GMT

### Minor changes

- feat(keymap): Add onChordState callback for chord progression observability. Emit 'started', 'progressed', and 'timeout' events independent of guard evaluation, enabling UI hints, logging, and debugging without blocking handler execution. Track chord state before guards to separate observation from execution. Improve documentation for guard composition and chord state independence. Add ChordStateChange to API overview.

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- refactor!: Remove layers and priority; make keymap lifecycle and guards explicit

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

- fix(keymap): correct chord cross-binding leakage, listBindings() mutation leak, and priority docs; add findShortcutConflicts(), mount/numeric dev warnings, matchStep malformed-event guard

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(keymap): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

