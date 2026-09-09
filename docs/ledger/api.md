---
title: Ledger — API Reference
description: Reference for serialized reversible commands, history state, composition, cancellation, disposal, and errors.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `createLedger()` | Create serialized reversible history | Sync construction | Every operation method is queued |
| `compose()` | Combine commands into one history entry | Sync construction | Child metadata is not aggregated |
| `ledger.do()` | Apply and record a command | Async | Failed or cancelled apply is not recorded |
| `ledger.undo()` / `redo()` | Move the latest history entry | Async | Failures leave history on its original side |
| `ledger.clear()` | Remove history without reverting | Async | Serialized behind earlier work |
| `ledger.whenIdle()` | Await an empty operation queue | Async | Cannot force non-cooperative work to settle |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/ledger` | Complete Ledger runtime, error hierarchy, state-readable contract, unsubscribe type, and command/history types |

## `createLedger()`

```ts
function createLedger<TMeta = undefined>(options?: LedgerOptions): Ledger<TMeta>
```

Creates a ledger with one submission-order operation queue and one atomic state readable.

```ts
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger<{ field: string }>({ maxHistory: 50 });
```

### `LedgerOptions`

```ts
interface LedgerOptions {
  maxHistory?: number;
}
```

`maxHistory` defaults to `100`. It must be a non-negative safe integer. `0` executes commands without retaining history.

## `compose()`

```ts
function compose<TMeta = undefined>(
  commands: readonly ReversibleCommand<TMeta>[],
  label?: string,
): ReversibleCommand<TMeta>
```

Snapshots child command callbacks, applies children in order, and reverts them in reverse order. The result creates one history entry with the supplied label and `meta: undefined`.

If child application fails, completed children are compensated in reverse order. Compensation attempts continue after failures. Combined apply and compensation failures are preserved in an `AggregateError`, which Ledger exposes as `LedgerExecutionError.cause`. Normal composed reversion also attempts every child and reports failures through `LedgerRollbackError.cause` as an `AggregateError`.

## `Ledger`

```ts
interface Ledger<TMeta = undefined> {
  clear(): Promise<void>;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  do(command: ReversibleCommand<TMeta>, options?: LedgerCallOptions): Promise<void>;
  redo(options?: LedgerCallOptions): Promise<void>;
  readonly state: LedgerReadable<LedgerState<TMeta>>;
  undo(options?: LedgerCallOptions): Promise<void>;
  whenIdle(): Promise<void>;
  [Symbol.dispose](): void;
}
```

All operation methods are serialized in call order.

### `do()`

Snapshots the command's `apply`, `revert`, `label`, and metadata reference when submitted. On successful apply it appends one undo entry, evicts the oldest entry beyond `maxHistory`, and clears redo history. Apply failure rejects with `LedgerExecutionError` and records nothing. Ledger does not automatically revert a failed individual command.

### `undo()`

Reverts the final undo entry. Success moves it to the end of redo history. If no undo entry exists, the queued operation resolves without changing history. Revert failure rejects with `LedgerRollbackError` and leaves the entry in undo history.

### `redo()`

Applies the final redo entry. Success moves it to the end of undo history. If no redo entry exists, it resolves without changing history. Apply failure rejects with `LedgerExecutionError` and leaves the entry in redo history.

### `clear()`

Queues removal of all undo and redo entries. It does not call command revert functions and does not cancel earlier work.

### `whenIdle()`

Resolves immediately when `queued` and `running` are zero, otherwise resolves after both reach zero. Multiple waiters are supported. It does not reject on disposal or cancel operations.

### Disposal

`dispose()` is permanent and idempotent. It sets `accepting: false`, clears undo and redo history, aborts active command contexts, and rejects queued operations that have not started with `LedgerDisposedError`. Active commands must observe their signal and settle before `running` reaches zero. `[Symbol.dispose]()` delegates to `dispose()`.

## Command Types

### `ReversibleCommand`

```ts
interface ReversibleCommand<TMeta = undefined> {
  readonly apply: (context: CommandContext) => Promise<void> | void;
  readonly label?: string;
  readonly meta?: TMeta;
  readonly revert: (context: CommandContext) => Promise<void> | void;
}
```

`apply` and `revert` may be synchronous or asynchronous. Metadata is retained by reference; Ledger does not deep-clone or deep-freeze it.

### `CommandContext`

```ts
interface CommandContext {
  readonly signal: AbortSignal;
}
```

The signal combines ledger disposal with the operation signal. Queued cancellation prevents user code from running. Active cancellation is cooperative. If user code ignores abort and completes, the operation still rejects with `LedgerCancelledError` and its history transition is not committed.

### `LedgerCallOptions`

```ts
interface LedgerCallOptions {
  signal?: AbortSignal;
}
```

Supported by `do()`, `undo()`, and `redo()`. `clear()` has no call options.

## State Types

### `LedgerState`

```ts
interface LedgerState<TMeta = undefined> {
  readonly accepting: boolean;
  readonly queued: number;
  readonly redo: readonly HistoryEntry<TMeta>[];
  readonly running: number;
  readonly undo: readonly HistoryEntry<TMeta>[];
}
```

| Field | Meaning |
| --- | --- |
| `accepting` | `true` until permanent disposal |
| `queued` | Submitted operations that have not started |
| `running` | Currently executing operation; serialization keeps this at 0 or 1 |
| `undo` | Chronological successfully applied history; final entry is next to undo |
| `redo` | Chronological reverted history; final entry is next to redo |

State objects and history arrays are frozen replacements.

### `HistoryEntry`

```ts
interface HistoryEntry<TMeta = undefined> {
  readonly label: string | undefined;
  readonly meta: TMeta | undefined;
}
```

History entries are frozen and intentionally omit command callbacks.

### `LedgerReadable` and `Unsubscribe`

`Ledger.state` implements this framework-neutral structural contract. Both names are root type exports.

```ts
type Unsubscribe = () => void;

interface LedgerReadable<T> {
  peek(): T;
  subscribe(listener: () => void): Unsubscribe;
  readonly value: T;
}
```

Subscriptions are not immediate and receive no value argument. Listeners run synchronously from a snapshot after state replacement. A listener failure does not interrupt Ledger bookkeeping or later listeners; it is rethrown in a microtask.

## Errors

| Error | Trigger | History result |
| --- | --- | --- |
| `LedgerCancelledError` | Queued signal cancellation or active cooperative cancellation | No transition committed |
| `LedgerDisposedError` | Submission after disposal or queued work rejected by disposal | History already cleared by disposal |
| `LedgerExecutionError` | `apply()` fails during `do()` or `redo()` | New command absent, or redo entry retained |
| `LedgerRollbackError` | `revert()` fails during `undo()` | Undo entry retained |
| `LedgerConfigurationError` | Invalid `maxHistory` | Construction fails |
| `LedgerError` | Base class and internal history corruption | Depends on operation |

Wrapped operation failures preserve the original value in `.cause`. Use `instanceof LedgerError` to catch the hierarchy, then narrow to a specific subtype.
