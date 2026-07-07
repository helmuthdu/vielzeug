# Change Log - @vielzeug/ledger

This log was last generated on Tue, 07 Jul 2026 09:20:39 GMT and should not be manually modified.

## 1.1.2
Tue, 07 Jul 2026 09:20:39 GMT

### Patches

- chore: declare minimum supported Node.js version (>=18) in package.json engines

## 1.1.1
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- feat(ledger): guard do/undo/redo/clear against disposed state, wrap execute/rollback errors in LedgerExecutionError/LedgerRollbackError, add AbortSignal cancellation support, make Command/compose generic over TData, fix README batch()/compose() mismatch

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(ledger): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release

