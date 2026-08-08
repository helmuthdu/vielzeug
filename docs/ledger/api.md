---
title: Ledger — API Reference
description: API reference for @vielzeug/ledger reversible commands, queue ownership, cancellation, and state snapshots.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createLedger()` | Create reversible async history | Sync | `dispose()` seals the owner |
| `compose()` | Combine reversible commands | Sync | Every child must revert |
| `Ledger` | History handle | Async methods | Catch operation failures |
| `ReversibleCommand` | Apply/revert state transition | Sync or async | Irreversible work is outside Ledger |
| `LedgerCancelledError` | Cancellation result | Sync | Different from execution failure |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/ledger` | Root entry for Ledger functions, errors, and public types. |

## Core Functions

### `createLedger()`

```ts
function createLedger<TMeta = undefined>(options?: LedgerOptions): Ledger<TMeta>;
```

Creates a serialized owner for reversible commands.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LedgerOptions` | History-cap configuration. |

**Returns:** `Ledger<TMeta>`.

```ts
import { createLedger } from '@vielzeug/ledger';

let value = 'before';
const ledger = createLedger();

await ledger.do({
  apply: () => { value = 'after'; },
  revert: () => { value = 'before'; },
});

await ledger.undo();
ledger.dispose();
```

### `compose()`

```ts
function compose<TMeta = undefined>(
  commands: readonly ReversibleCommand<TMeta>[],
  label?: string,
): ReversibleCommand<TMeta>;
```

Snapshots reversible children and returns one reversible command.

| Parameter | Type | Description |
| --- | --- | --- |
| `commands` | `readonly ReversibleCommand<TMeta>[]` | Commands to apply in order and revert in reverse order. |
| `label` | `string` | Optional history label. |

**Returns:** `ReversibleCommand<TMeta>`.

```ts
import { compose } from '@vielzeug/ledger';

const move = compose([
  { apply: moveX, revert: restoreX },
  { apply: moveY, revert: restoreY },
], 'Move node');
```

If apply and compensation both fail, the resulting `LedgerExecutionError.cause` is an `AggregateError` containing every failure.

## `Ledger`

```ts
interface Ledger<TMeta = undefined> {
  clear(): Promise<void>;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  do(command: ReversibleCommand<TMeta>, options?: LedgerCallOptions): Promise<void>;
  redo(options?: LedgerCallOptions): Promise<void>;
  readonly state: Readable<LedgerState<TMeta>>;
  undo(options?: LedgerCallOptions): Promise<void>;
  whenIdle(): Promise<void>;
  [Symbol.dispose](): void;
}
```

| Member | Return | Contract |
| --- | --- | --- |
| `do()` | `Promise<void>` | Applies and records a command. |
| `undo()` | `Promise<void>` | Reverts latest undo entry. |
| `redo()` | `Promise<void>` | Reapplies latest redo entry. |
| `clear()` | `Promise<void>` | Clears retained undo and redo history. |
| `whenIdle()` | `Promise<void>` | Resolves when queued and running counts are zero. |
| `dispose()` | `void` | Seals owner, aborts active contexts, rejects unstarted work. |
| `state` | `Readable<LedgerState<TMeta>>` | Atomic lifecycle and history snapshot. |

## Types

### `CommandContext`

```ts
interface CommandContext {
  readonly signal: AbortSignal;
}
```

Context passed to apply and revert. Active work must observe `signal` cooperatively.

### `ReversibleCommand`

```ts
interface ReversibleCommand<TMeta = undefined> {
  readonly apply: (context: CommandContext) => Promise<void> | void;
  readonly label?: string;
  readonly meta?: TMeta;
  readonly revert: (context: CommandContext) => Promise<void> | void;
}
```

### `HistoryEntry`

```ts
interface HistoryEntry<TMeta = undefined> {
  readonly label: string | undefined;
  readonly meta: TMeta | undefined;
}
```

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

### `LedgerOptions`

```ts
interface LedgerOptions {
  maxHistory?: number;
}
```

`maxHistory` defaults to `100`, accepts non-negative safe integers, and uses `0` for no retained history.

### `LedgerCallOptions`

```ts
interface LedgerCallOptions {
  signal?: AbortSignal;
}
```

An already-aborted signal rejects before user code starts. Active commands receive a merged signal.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `LedgerCancelledError` | Operation cancels before start or cooperatively stops | May carry original abort cause |
| `LedgerDisposedError` | Operation submitted to sealed ledger | Queued work rejects without starting |
| `LedgerExecutionError` | `apply()` fails | Original failure in `.cause` |
| `LedgerRollbackError` | `revert()` fails | Entry remains in undo history |
| `LedgerError` | Base class | `LedgerError.is(error)` narrows all Ledger errors |
