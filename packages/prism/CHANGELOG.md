# Change Log - @vielzeug/prism

This log was last generated on Fri, 24 Jul 2026 05:28:41 GMT and should not be manually modified.

## 1.1.6
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.1.5
Fri, 17 Jul 2026 14:17:07 GMT

_Version update only_

## 1.1.4
Wed, 15 Jul 2026 07:45:31 GMT

_Version update only_

## 1.1.3
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.1.2
Tue, 07 Jul 2026 09:20:39 GMT

_Version update only_

## 1.1.1
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- fix(prism): fix scale/axis/grid correctness (reversed domains, tick-count sync, band-axis centering), harden tooltip XSS default and easing prototype-key lookup, add a11y live regions and aria-hidden decorative elements, implement CrosshairConfig.snap, cancel in-flight chart animations on dispose, isolate plugin install()/dispose() failures, add resetTheme() and a working /devtools debugChart(), fix cross-realm container validation, make scale factories destructuring-safe, and sync docs with the current API

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(prism): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

