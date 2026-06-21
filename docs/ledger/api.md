---
title: Ledger — API Reference
description: Full API reference for @vielzeug/ledger — createLedger, Ledger interface, Command, and all types.
---

# API Reference

## API Overview

| Export | Kind | Execution mode | Description |
| ------ | ---- | -------------- | ----------- |
| `createLedger` | function | async | Creates an undo/redo command stack |
| `compose` | function | — | Combines multiple commands into one reversible command |
| `Ledger` | interface | — | Object returned by `createLedger` |
| `Command` | interface | — | A command: `{ execute, rollback?, label? }` |
| `LedgerOptions` | interface | — | Options for `createLedger` |
| `CommandMeta` | interface | — | Metadata entry in `historySnapshot` |

## Package Entry Points

```ts
import { compose, createLedger } from '@vielzeug/ledger';
import type { Command, CommandMeta, Ledger, LedgerOptions } from '@vielzeug/ledger';
```

## `createLedger(options?)`

Creates an async undo/redo command history.

```ts
function createLedger(options?: LedgerOptions): Ledger
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
interface Ledger {
  readonly canRedo:         Computed<boolean>;
  readonly canUndo:         Computed<boolean>;
  readonly historySize:     Computed<number>;
  readonly historySnapshot: Computed<readonly CommandMeta[]>;
  readonly isProcessing:    Computed<boolean>;

  clear(): void;
  dispose(): void;
  do(command: Command): Promise<void>;
  redo(): Promise<void>;
  undo(): Promise<void>;
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
| `historySnapshot` | `Computed<readonly CommandMeta[]>` | Metadata for each undo entry, newest first |
| `isProcessing` | `Computed<boolean>` | `true` while an operation is executing or rolling back |

### `do(command)`

Executes a command and pushes it onto the undo stack. Clears the redo stack.

```ts
ledger.do(command): Promise<void>
```

If `execute()` rejects, the command is not added to the stack.

### `undo()`

Pops the top entry from the undo stack and pushes it onto the redo stack. If the entry has a `rollback`, it is called first.

```ts
ledger.undo(): Promise<void>
```

No-op when `canUndo.value === false`. If `rollback()` throws, a dev warning is issued, `onRollbackError` is called (if configured), and the stack position is left unchanged. Commands without a `rollback` are popped and moved to the redo stack without any reversal.

### `redo()`

Pops the top entry from the redo stack, calls `execute()`, and pushes it back onto the undo stack.

```ts
ledger.redo(): Promise<void>
```

No-op when `canRedo.value === false`.

### `clear()`

Empties both the undo and redo stacks synchronously.

```ts
ledger.clear()
```

### `dispose()`

Clears both stacks and disposes all Ripple signals. After `dispose()`, reading `.value` on any signal returns `undefined`.

```ts
ledger.dispose();
// or:
using ledger = createLedger();
```

## `Command`

```ts
interface Command {
  execute:   () => Promise<void> | void;
  rollback?: () => Promise<void> | void;
  label?:    string;
}
```

Both `execute` and `rollback` accept sync and async functions.

`rollback` is optional. Commands without one are still tracked in history; `undo()` moves them on the stack but performs no reversal.

`label` is optional — it surfaces in `historySnapshot.value` for building undo history UI.

## `LedgerOptions`

```ts
interface LedgerOptions {
  maxHistory?:      number;                               // default: 100
  onRollbackError?: (err: unknown, meta: CommandMeta) => void;
}
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `maxHistory` | `100` | Maximum undo stack depth. Oldest entries evicted on overflow. |
| `onRollbackError` | — | Called when `rollback()` throws. Useful for surfacing undo failures to the UI without parsing console warnings. |

## `compose(commands, label?)`

Combines multiple commands into a single reversible command that counts as one undo step.

```ts
function compose(commands: Command[], label?: string): Command
```

`execute` runs all sub-commands in order. **If any sub-command fails, already-executed sub-commands are rolled back automatically (best-effort) before the error is re-thrown** — making `compose()` atomic. `rollback` runs sub-commands in reverse, skipping any without a defined `rollback`. `rollback` is `undefined` when no sub-command defines one. Pass the result directly to `ledger.do()`:

```ts
await ledger.do(compose([
  { execute: () => { node.x = newX; }, rollback: () => { node.x = oldX; } },
  { execute: () => { node.y = newY; }, rollback: () => { node.y = oldY; } },
], 'Move node'));
```

## `CommandMeta`

Shape of entries in `historySnapshot.value`:

```ts
interface CommandMeta {
  label: string | undefined;
}
```
