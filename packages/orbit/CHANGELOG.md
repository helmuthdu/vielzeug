# Change Log - @vielzeug/orbit

This log was last generated on Tue, 14 Jul 2026 06:12:09 GMT and should not be manually modified.

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

- fix(orbit): stop redundant DOM reads in computePosition hot path, export getRects, fix README API drift, add devtools/error test coverage

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(orbit): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

