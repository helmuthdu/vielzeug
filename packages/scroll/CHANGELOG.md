# Change Log - @vielzeug/scroll

This log was last generated on Fri, 21 Aug 2026 16:02:58 GMT and should not be manually modified.

## 2.1.2
Fri, 21 Aug 2026 16:02:58 GMT

_Version update only_

## 2.1.1
Wed, 19 Aug 2026 06:57:36 GMT

_Version update only_

## 2.1.0
Sun, 16 Aug 2026 09:15:40 GMT

### Minor changes

- feat: Add keyboard navigation support to all virtualizers. Enable with `keyboardScroll: true`. Supports Arrow/Page/Home/End keys with intelligent step sizing based on item estimates.
- feat: Add auto-measurement feature with `autoMeasure: true` for dynamic variable-height content. Automatically measures visible items via ResizeObserver.
- refactor: Add Signal integration to all factories with `signal` option for reactive state. Enables seamless integration with @vielzeug/ripple.
- refactor: Remove createReactiveVirtualizer and related reactive wrappers. Use `signal` option directly on any factory instead.

### Patches

- refactor: Extract sticky item computation to reusable `_sticky.ts` helper module. Eliminates duplication between virtualizer and grouped-virtualizer.
- fix: Add destroyed state checks in keyboard event handlers to prevent calling computeVisible() after disposal.
- fix: Improve arrow key step sizing to use estimated item size instead of fixed 40px value for better UX consistency.
- docs: Add comprehensive documentation for keyboard navigation and auto-measurement features with usage examples and requirements.

## 2.0.2
Sat, 15 Aug 2026 06:26:02 GMT

_Version update only_

## 2.0.1
Mon, 10 Aug 2026 21:21:35 GMT

_Version update only_

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- feat!: validate static virtualizer configuration and support callback updates

## 1.1.6
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 1.1.5
Wed, 05 Aug 2026 16:48:52 GMT

_Version update only_

## 1.1.4
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- refactor(scroll): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

## 1.1.3
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.1.2
Fri, 17 Jul 2026 14:17:07 GMT

_Version update only_

## 1.1.1
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.1.0
Wed, 08 Jul 2026 17:19:00 GMT

### Minor changes

- feat(dom-virtual-list): add stickToBottom option and Virtualizer#isAtEnd for chat-style 'stick to bottom on new message' auto-scrolling

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

- fix(scroll): fix ResizeObserver leak on dispose, stale README dispose() calls, reactive Proxy state visibility (has/ownKeys/getOwnPropertyDescriptor), and grouped-virtualizer Symbol.dispose binding; add error-class test coverage; rename axis1d.ts to _axis1d.ts; sync docs and add grid/reactive REPL examples

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(scroll): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

