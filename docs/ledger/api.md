---
title: Ledger — API Reference
description: Full API reference for @vielzeug/ledger — createLedger, Ledger interface, Command, and all types.
---

[[toc]]

## API Overview

| Export | Kind | Execution mode | Description |
| ------ | ---- | -------------- | ----------- |
| `createLedger` | function | async | Creates an undo/redo command stack |
| `compose` | function | — | Combines multiple commands into one reversible command |
| `Ledger` | interface | — | Object returned by `createLedger` |
| `Command` | interface | — | A command: `{ execute, rollback?, label? }` |
| `LedgerOptions` | interface | — | Options for `createLedger` |
| `LedgerCallOptions` | interface | — | Options for `do()`/`undo()`/`redo()` — cancellation |
| `CommandMeta` | interface | — | Metadata entry in `historySnapshot` |

## Package Entry Points

```ts
import { compose, createLedger } from '@vielzeug/ledger';
import type { Command, CommandMeta, Ledger, LedgerCallOptions, LedgerOptions } from '@vielzeug/ledger';
```

## `createLedger(options?)`

Creates an async undo/redo command history.

```ts
function createLedger<TData = unknown>(options?: LedgerOptions<TData>): Ledger<TData>
```

**Parameters**

- `options.maxHistory` — Maximum number of entries in the undo stack (default: `100`). Oldest entries are evicted when exceeded.
- `options.onRollbackError` — Optional callback invoked when `rollback()` throws. Receives the error and the `CommandMeta` of the failing command. The stack position is left unchanged regardless.

**Returns** a `Ledger` object.

```ts
const ledger = createLedger({ maxHistory: 50 });
```

## `Ledger`

```ts
interface Ledger<TData = unknown> {
  readonly canRedo:         Computed<boolean>;
  readonly canUndo:         Computed<boolean>;
  readonly disposalSignal:  AbortSignal;
  readonly disposed:        boolean;
  readonly historySize:     Computed<number>;
  readonly historySnapshot: Computed<readonly CommandMeta<TData>[]>;
  readonly isProcessing:    Computed<boolean>;
  readonly pendingCount:    Computed<number>;

  clear(): Promise<void>;
  dispose(): void;
  do(command: Command<TData>, options?: LedgerCallOptions): Promise<void>;
  redo(options?: LedgerCallOptions): Promise<void>;
  undo(options?: LedgerCallOptions): Promise<void>;
  [Symbol.dispose](): void;
}
```

### Reactive signals

All signals are Ripple `Computed<T>` — read `.value` or call `.subscribe()`.

| Signal | Type | Description |
| ------ | ---- | ----------- |
| `canUndo` | `Computed<boolean>` | `true` when the undo stack is non-empty |
| `canRedo` | `Computed<boolean>` | `true` when the redo stack is non-empty |
| `historySize` | `Computed<number>` | Number of undo steps available |
| `historySnapshot` | `Computed<readonly CommandMeta<TData>[]>` | Metadata for each undo entry, newest first |
| `isProcessing` | `Computed<boolean>` | `true` while a command's `execute` or `rollback` is running; `false` during a queued `clear()` |
| `pendingCount` | `Computed<number>` | Number of operations currently in the queue (executing + waiting) |

### `disposalSignal` / `disposed`

```ts
readonly disposalSignal: AbortSignal
readonly disposed: boolean
```

`disposalSignal` aborts when `dispose()` runs — it's the same signal merged into the one
passed to `execute`/`rollback` (see [`LedgerCallOptions`](#ledgercalloptions)). `disposed`
flips to `true` at the same point.

### `do(command, options?)`

Executes a command and pushes it onto the undo stack. Clears the redo stack.

```ts
ledger.do(command: Command<TData>, options?: LedgerCallOptions): Promise<void>
```

If `execute()` rejects, the command is not added to the stack. Rejects with
`LedgerDisposedError` if the ledger is already disposed — `execute()` is never called.

### `undo(options?)`

Pops the top entry from the undo stack and pushes it onto the redo stack. If the entry has a `rollback`, it is called first.

```ts
ledger.undo(options?: LedgerCallOptions): Promise<void>
```

No-op when `canUndo.value === false`. If `rollback()` throws, a dev warning is issued, `onRollbackError` is called with a `LedgerRollbackError` (if configured), and the stack position is left unchanged. Commands without a `rollback` are popped and moved to the redo stack without any reversal. Rejects with `LedgerDisposedError` if the ledger is already disposed.

### `redo(options?)`

Pops the top entry from the redo stack, calls `execute()`, and pushes it back onto the undo stack.

```ts
ledger.redo(options?: LedgerCallOptions): Promise<void>
```

No-op when `canRedo.value === false`. Rejects with `LedgerExecutionError` if `execute()` throws, and with `LedgerDisposedError` if the ledger is already disposed.

### `clear()`

Enqueues a reset of both the undo and redo stacks. Returns a `Promise` that resolves once the reset has run (after any already-queued operations complete).

```ts
await ledger.clear()
```

Safe to call while operations are in flight — the clear is serialised in the queue and runs after the current operation finishes. Rejects with `LedgerDisposedError` if the ledger is already disposed.

### `dispose()`

Clears both stacks, aborts `disposalSignal`, and disposes all Ripple signals. After `dispose()`, reading `.value` on any signal returns `undefined`, and `do()`/`undo()`/`redo()`/`clear()` reject with `LedgerDisposedError`.

```ts
ledger.dispose();
// or:
using ledger = createLedger();
```

## `Command`

```ts
interface Command<TData = unknown> {
  data?:     TData;
  execute:   (signal?: AbortSignal) => Promise<void> | void;
  rollback?: (signal?: AbortSignal) => Promise<void> | void;
  label?:    string;
}
```

Both `execute` and `rollback` accept sync and async functions. Both receive an `AbortSignal` — see [`LedgerCallOptions`](#ledgercalloptions) — but the parameter is optional, so existing commands that ignore it (`execute: () => {...}`) still type-check.

`rollback` is optional. Commands without one are still tracked in history; `undo()` moves them on the stack but performs no reversal.

`label` is optional — it surfaces in `historySnapshot.value` for building undo history UI.

`data` is an optional custom metadata payload, typed to the `TData` type parameter of `createLedger<TData>`. It is stored as-is in `historySnapshot.value[n].data`. Use it to attach context needed by undo-history UIs (e.g. before/after snapshots, affected IDs).

## `LedgerOptions`

```ts
interface LedgerOptions<TData = unknown> {
  maxHistory?:      number;                                        // default: 100
  onRollbackError?: (err: unknown, meta: CommandMeta<TData>) => void;
}
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `maxHistory` | `100` | Maximum undo stack depth. Oldest entries evicted on overflow. |
| `onRollbackError` | — | Called with a `LedgerRollbackError` when `rollback()` throws. Useful for surfacing undo failures to the UI without parsing console warnings. |

## `LedgerCallOptions`

Options accepted by `do()`/`undo()`/`redo()`.

```ts
interface LedgerCallOptions {
  signal?: AbortSignal;
}
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `signal` | — | Merged with the ledger's own `disposalSignal` via `AbortSignal.any()` and passed to `execute`/`rollback`. Lets a long-running command observe caller-initiated cancellation, ledger disposal, or both. |

`execute`/`rollback` always receive a live `AbortSignal`, even when `options.signal` is omitted — it's the ledger's own `disposalSignal` in that case, so every command can at least observe disposal.

```ts
const controller = new AbortController();

await ledger.do(
  {
    execute: async (signal) => {
      await fetch('/api/save', { signal });
    },
  },
  { signal: controller.signal },
);

controller.abort(); // aborts the fetch above, if still in flight
```

## `compose(commands, label?)`

Combines multiple commands into a single reversible command that counts as one undo step.

```ts
function compose<TData = unknown>(commands: Command<TData>[], label?: string): Command<TData>
```

`execute` runs all sub-commands in order and forwards its own `signal` argument to every sub-command's `execute`. **If any sub-command fails, already-executed sub-commands are rolled back automatically (best-effort) before the error is re-thrown** — making `compose()` atomic. `rollback` runs sub-commands in reverse (also forwarding `signal`), skipping any without a defined `rollback`. If a sub-command's `rollback` throws during `undo()`, the error is propagated to the ledger's `onRollbackError` callback (if configured). `rollback` is `undefined` when no sub-command defines one. Pass the result directly to `ledger.do()`:

```ts
await ledger.do(compose([
  { execute: () => { node.x = newX; }, rollback: () => { node.x = oldX; } },
  { execute: () => { node.y = newY; }, rollback: () => { node.y = oldY; } },
], 'Move node'));
```

## `CommandMeta`

Shape of entries in `historySnapshot.value`:

```ts
interface CommandMeta<TData = unknown> {
  data:  TData | undefined;
  label: string | undefined;
}
```

`data` holds the value from `Command.data`. The type parameter is inferred from `createLedger<TData>()`; it defaults to `unknown` when no type argument is supplied.

---

## Errors

### `LedgerError`

Base class for all ledger errors. Use `instanceof LedgerError` or `LedgerError.is()` to catch any ledger-originated error.

```ts
class LedgerError extends Error {
  static is(err: unknown): err is LedgerError;
}
```

**Named subclasses**

| Class                  | Thrown when                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| `LedgerDisposedError`  | `do()`/`undo()`/`redo()`/`clear()` is called on a disposed ledger instance      |
| `LedgerExecutionError` | A command's `execute()` function throws; original error available via `.cause` |
| `LedgerRollbackError`  | Passed to `onRollbackError` when a command's `rollback()` function throws during undo; original error via `.cause` |
