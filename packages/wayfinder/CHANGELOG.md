# Change Log - @vielzeug/wayfinder

This log was last generated on Mon, 17 Aug 2026 10:42:29 GMT and should not be manually modified.

## 2.1.0
Mon, 17 Aug 2026 10:42:29 GMT

### Minor changes

- refactor: remove WayfinderError.is() type guard (use instanceof). Remove MatchStatus type alias (use NavigationStatus). Remove devOnly dead code. Remove RouterErrorSource and RouteChildren from public exports. Remove unused _initialBranch parameter from #runTerminal. Make commit callback required in #handleRoute. Document load middleware skip behavior. Rename matchPath() to match() and loadPath() to load() for terser public API.

## 2.0.0
Mon, 10 Aug 2026 15:11:23 GMT

### Breaking changes

- refactor!: redesign navigation coordination, add ready, and rename resolve/match to match/load

## 1.0.5
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

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

- fix: prevent preload() from running after dispose, guard parseQuery against __proto__ key hijack, add devtools test coverage

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(wayfinder): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

