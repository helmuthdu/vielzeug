---
title: Ledger 2.0 Migration
description: Migrate Ledger 1.x reversible history, operation ownership, state snapshots, and cancellation to Ledger 2.
---

[[toc]]

# Migration

## Ledger 2 Changes

Ledger 2 accepts only reversible commands, publishes one `state` snapshot, and separates queued cancellation from active cooperative cancellation.

Removed APIs:

- `Command`
- `CommandMeta`
- `canUndo`, `canRedo`, `historySize`, `historySnapshot`, `isProcessing`, `pendingCount`

## Rename Commands

Replace optional `execute` and `rollback` with required `apply` and `revert`.

```ts
// Ledger 1
await ledger.do({
  execute: () => saveNext(),
  rollback: () => restorePrevious(),
});
```

```ts
// Ledger 2
await ledger.do({
  apply: () => saveNext(),
  revert: () => restorePrevious(),
});
```

Move irreversible work outside Ledger commands.

## Replace Individual Readables

Read history and queue state from `ledger.state`.

```ts
// Ledger 1
if (ledger.canUndo.value) void ledger.undo();
console.log(ledger.historySnapshot.value);
```

```ts
// Ledger 2
if (ledger.state.value.undo.length > 0) void ledger.undo();
console.log(ledger.state.value.undo);
```

`state` updates atomically for every Ledger transition.

## Handle Cancellation

Queued cancelled work rejects `LedgerCancelledError` before user code starts. Active work receives `context.signal` and must stop cooperatively.

```ts
const controller = new AbortController();
const operation = ledger.do(command, { signal: controller.signal });

controller.abort();
await operation.catch((error) => {
  if (!(error instanceof LedgerCancelledError)) throw error;
});
```

Use `whenIdle()` when an owner needs active work to settle after disposal.

## Compose Only Reversible Steps

`compose()` now accepts `readonly ReversibleCommand[]`.

```ts
// Ledger 1
compose([
  { execute: updateState, rollback: restoreState },
  { execute: () => bus.emit('saved') },
]);
```

```ts
// Ledger 2
await ledger.do({ apply: updateState, revert: restoreState });
bus.emit('saved');
```

If application and compensation both fail, inspect `LedgerExecutionError.cause` as `AggregateError`.

## Upgrade Checklist

- Replace `Command` with `ReversibleCommand`.
- Rename `execute`/`rollback` to `apply`/`revert`.
- Move effects and notifications outside `compose()`.
- Replace individual history readables with `state` reads.
- Catch `LedgerCancelledError` separately from execution failures.
- Await `whenIdle()` at lifecycle drain boundaries.
- Update `@vielzeug/ledger` to version 3.
