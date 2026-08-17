# Change Log - @vielzeug/coins

This log was last generated on Mon, 17 Aug 2026 10:42:29 GMT and should not be manually modified.

## 2.1.0
Mon, 17 Aug 2026 10:42:29 GMT

### Minor changes

- chore: remove decimal() from public API (Decimal type remains exported for ExchangeRate.value). Remove CoinsError.is() static method (use instanceof CoinsError). sum() now infers currency from non-empty values; { currency } only required for empty iterables. Add rounding option to FormatOptions (default halfAwayFromZero). Add FORMAT_ERROR code for format failures (replaces mislabeled INVALID_ROUNDING/INVALID_CURRENCY). Simplify divide() sign handling for readability.

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- Redesign exact money and currency APIs

## 1.0.5
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- fix(coins): remove dead @vielzeug/arsenal vite external — no longer imported and never declared as a dependency; derive the (now empty) external list via readWorkspaceDeps() instead of a hand-listed array

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

- fix(coins): widen dev-warning scientific-notation detection, wire CurrencyCode into signatures, accept number rate in exchange(), remove dead arsenal dep, fix error-class docs

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(coins): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

