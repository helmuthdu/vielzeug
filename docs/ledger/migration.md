---
title: Ledger 2.0 Migration
---

# Ledger 2.0 Migration

Ledger 2.0 exposes reactive ledger state as `Readable` values.

## Read state reactively

Replace direct state reads and legacy subscription shapes with the `Readable` values exposed by the 2.0 ledger. Derive UI and application behavior from those values instead of copying ledger state.

## Recheck command lifecycle handling

Keep command execution, rollback, disposal, and error handling at the ledger boundary. Handle `LedgerExecutionError` and `LedgerRollbackError` where commands are invoked.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current `createLedger`, command, call-option, and reactive-state contracts.
