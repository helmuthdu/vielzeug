---
title: Ledger — Migration Guide
description: Migrate Ledger runtime injection, reactive state, reversible commands, cancellation, and lifecycle contracts.
---

[[toc]]

## Ledger 3.1

Ledger 3.1 unifies the observable-state contract, removes redundant state, and tightens disposal behavior.

### `state` is now `Subscribable`

`LedgerReadable` is replaced by the exported `Subscribable` contract, which matches `Subscribable` in `@vielzeug/arsenal`: `getSnapshot()` and `subscribe(listener)`. The duplicate `value` getter and `peek()` read are gone — one read shape remains.

```ts
// Before
const undo = ledger.state.value.undo;
const undo2 = ledger.state.peek().undo;

// After
const undo = ledger.state.getSnapshot().undo;
```

### `accepting` is removed

`LedgerState.accepting` duplicated `ledger.disposed` (it only ever flipped during `dispose()`). Read `disposed` instead.

```ts
// Before
const { accepting } = ledger.state.getSnapshot();

// After
const accepting = !ledger.disposed;
```

### `whenIdle()` rejects on disposal

`whenIdle()` no longer resolves against a disposed ledger. It rejects with `LedgerDisposedError` immediately if already disposed, or while waiting if disposal happens first — matching `do()`, `undo()`, `redo()`, and `clear()`.

### `clear()` skips empty history

`clear()` resolves without queueing when undo and redo are already empty, and rejects with `LedgerDisposedError` after disposal.

### `LedgerConfigurationError` is renamed

The config error is now `LedgerConfigError`, matching the `<Pkg>ConfigError` name used across the monorepo.

---

## Ledger 3.0

Ledger 3.0 removes its Ripple dependency and runtime injection. Command, queue, history, cancellation, composition, and command-error behavior remain unchanged. State subscriptions become framework-neutral invalidation callbacks with isolated listener failures.

### Remove the `runtime` option

```ts
// Before
import * as ripple from '@vielzeug/ripple';
const ledger = createLedger({ maxHistory: 50, runtime: ripple });

// After
const ledger = createLedger({ maxHistory: 50 });
```

`LedgerOptions` now contains only `maxHistory`.

### Adapt the structural state readable

`ledger.state` is no longer a Ripple signal. It implements a framework-neutral structural contract with `getSnapshot()` and `subscribe(listener)`. Subscriptions are invalidation callbacks: they are not immediate, receive no value argument, and run from a listener snapshot. Failures are rethrown in a microtask without interrupting Ledger bookkeeping or later subscribers.

```ts
// Before — Ripple dependency tracking
const stop = effect(() => renderHistory(ledger.state.getSnapshot()));

// After — framework-neutral subscription
const render = () => renderHistory(ledger.state.getSnapshot());
render();
const stop = ledger.state.subscribe(render);
```

Project it into Ripple explicitly when the application needs Ripple derivations:

```ts
import { signal } from '@vielzeug/ripple';

const state = signal(ledger.state.getSnapshot());
const stop = ledger.state.subscribe(() => {
  state.value = ledger.state.getSnapshot();
});
```

State replacements, history arrays, and history entries remain frozen. Metadata remains a caller-owned reference.

---

## Ledger 2.0

Ledger 2.0 accepts only reversible commands, publishes one atomic state snapshot, and separates queued cancellation from active cooperative cancellation.

### Rename commands

Replace optional `execute` and `rollback` with required `apply` and `revert`.

```ts
// Before
await ledger.do({
  execute: saveNext,
  rollback: restorePrevious,
});

// After
await ledger.do({
  apply: saveNext,
  revert: restorePrevious,
});
```

Move irreversible work outside Ledger commands.

### Replace individual readables

```ts
// Before
if (ledger.canUndo.value) void ledger.undo();
console.log(ledger.historySnapshot.value);

// After
if (ledger.state.getSnapshot().undo.length > 0) void ledger.undo();
console.log(ledger.state.getSnapshot().undo);
```

Removed names include `Command`, `CommandMeta`, `canUndo`, `canRedo`, `historySize`, `historySnapshot`, `isProcessing`, and `pendingCount`.

### Handle cancellation

Queued signal cancellation rejects with `LedgerCancelledError` before user code starts. Active work receives `context.signal` and must stop cooperatively.

```ts
const controller = new AbortController();
const operation = ledger.do(command, { signal: controller.signal });
controller.abort();

await operation.catch((error) => {
  if (!(error instanceof LedgerCancelledError)) throw error;
});
```

If active code ignores cancellation and finishes, its history transition is not committed. Ledger does not automatically compensate partial effects.

### Compose only reversible steps

`compose()` accepts readonly reversible commands, applies them in order, and reverts or compensates in reverse order.

```ts
await ledger.do(
  compose([
    { apply: updateX, revert: restoreX },
    { apply: updateY, revert: restoreY },
  ], 'Move item'),
);
```

If application and compensation both fail, inspect `LedgerExecutionError.cause` as an `AggregateError`.

## Upgrade Checklist

- Remove `LedgerOptions.runtime`.
- Replace automatic Ripple dependency tracking with `ledger.state.subscribe()` or an explicit adapter signal.
- Import `Subscribable` and `Unsubscribe` when framework adapters need explicit annotations.
- Replace `Command` with `ReversibleCommand`.
- Rename `execute` / `rollback` to `apply` / `revert`.
- Replace individual history readables with one `state` snapshot.
- Catch `LedgerCancelledError` separately from execution and rollback failures.
- Keep irreversible work outside commands.
- Await `whenIdle()` at lifecycle drain boundaries.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.
