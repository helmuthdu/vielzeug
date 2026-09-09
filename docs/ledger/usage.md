---
title: Ledger — Usage Guide
description: Record reversible commands, observe serialized history, handle failures, and own cancellation and disposal.
---

[[toc]]

## Basic Usage

Capture both sides of a reversible transition before submitting it.

```ts
import { createLedger } from '@vielzeug/ledger';

using ledger = createLedger();
const item = { name: 'Old name' };
const previous = item.name;
const next = 'New name';

await ledger.do({
  apply: () => { item.name = next; },
  label: 'Rename item',
  revert: () => { item.name = previous; },
});

await ledger.undo();
await ledger.redo();
```

All `do()`, `undo()`, `redo()`, and `clear()` calls join one submission-order queue. Keep irreversible effects outside commands unless they have a real compensating operation.

## Read Atomic State

`state` is a framework-neutral `LedgerReadable`, not a Ripple signal. Read `value` or `peek()`, and subscribe to invalidation callbacks.

```ts
function renderHistory(): void {
  const { accepting, queued, redo, running, undo } = ledger.state.value;
  undoButton.disabled = undo.length === 0 || !accepting;
  redoButton.disabled = redo.length === 0 || !accepting;
  spinner.hidden = queued + running === 0;
}

renderHistory();
const stop = ledger.state.subscribe(renderHistory);
```

Subscriptions are not immediate and receive no value argument. They run synchronously from a listener snapshot after every state replacement. A failure is rethrown in a microtask without interrupting Ledger bookkeeping or later subscribers.

State objects, history arrays, and history entries are frozen snapshots. `undo` and `redo` are chronological; the next command to undo or redo is the final item. Metadata values are retained by reference rather than deep-cloned.

## Attach History Metadata

Set `label` for presentation and use the ledger's metadata type for application context.

```ts
const ledger = createLedger<{ field: string }>();

await ledger.do({
  apply: () => { form.email = next; },
  label: 'Edit email',
  meta: { field: 'email' },
  revert: () => { form.email = previous; },
});

console.log(ledger.state.value.undo.at(-1));
```

Ledger snapshots command callbacks, label, and metadata references when `do()` is submitted. Later mutation of the command object does not replace the captured callbacks.

## Compose Reversible Commands

`compose()` produces one command and one history entry. Children apply in order and revert in reverse order.

```ts
import { compose } from '@vielzeug/ledger';

await ledger.do(
  compose([
    { apply: () => { node.x = nextX; }, revert: () => { node.x = previousX; } },
    { apply: () => { node.y = nextY; }, revert: () => { node.y = previousY; } },
  ], 'Move node'),
);
```

If a child apply fails, already-applied children are compensated in reverse order. Compensation continues after failures. If application and compensation both fail, `LedgerExecutionError.cause` is an `AggregateError` containing all failures. A composed command records the supplied label but does not aggregate child metadata.

## Handle Operation Failures

```ts
import {
  LedgerCancelledError,
  LedgerExecutionError,
  LedgerRollbackError,
} from '@vielzeug/ledger';

try {
  await ledger.undo();
} catch (error) {
  if (error instanceof LedgerCancelledError) {
    // Expected cancellation.
  } else if (error instanceof LedgerRollbackError) {
    showUndoError(error.cause);
  } else if (error instanceof LedgerExecutionError) {
    showApplyError(error.cause);
  } else {
    throw error;
  }
}
```

A failed `do()` is not recorded and is not automatically reverted. A failed `undo()` remains in undo history; a failed `redo()` remains in redo history, allowing retry after the underlying problem is corrected.

## Cancel Work

Pass a signal per operation. Queued cancellation prevents user code from starting. Active work receives a combined signal and must stop cooperatively.

```ts
const controller = new AbortController();
const operation = ledger.do(
  {
    apply: ({ signal }) => saveDraft(nextDraft, { signal }),
    revert: ({ signal }) => saveDraft(previousDraft, { signal }),
  },
  { signal: controller.signal },
);

controller.abort();
await operation.catch(handleHistoryFailure);
```

If active user code ignores cancellation and finishes, Ledger rejects with `LedgerCancelledError` and does not record or move history. It does not compensate partial effects automatically, so command implementations must check or forward `context.signal` before committing changes.

## Limit and Clear History

`maxHistory` defaults to `100` and accepts non-negative safe integers. Successful commands beyond the cap evict the oldest undo entries. `0` executes commands without retaining undo or redo history.

```ts
const ledger = createLedger({ maxHistory: 30 });
await ledger.clear();
```

`clear()` is serialized behind earlier work and clears both history arrays without reverting commands.

## Drain and Dispose

`whenIdle()` resolves when both `queued` and `running` reach zero. It does not cancel work.

```ts
const operation = ledger.do(command);
const idle = ledger.whenIdle();

ledger.dispose();
await operation.catch(handleHistoryFailure);
await idle;
```

Disposal is permanent and idempotent. It immediately sets `accepting: false`, clears history, aborts active contexts, and rejects queued work with `LedgerDisposedError`. Active operations settle cooperatively; `whenIdle()` waits for them. Work that never settles can keep `whenIdle()` pending.

## Framework Integration

Keep one ledger per owning scope and adapt its structural readable through the framework's subscription API.

::: code-group

```tsx [React]
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createLedger } from '@vielzeug/ledger';

export function UndoStatus() {
  const ledger = useMemo(() => createLedger(), []);
  const state = useSyncExternalStore(
    (notify) => ledger.state.subscribe(notify),
    () => ledger.state.value,
    () => ledger.state.value,
  );

  useEffect(() => () => ledger.dispose(), [ledger]);
  return <span>{state.undo.length} undo / {state.redo.length} redo</span>;
}
```

```ts [Vue 3]
import { onUnmounted, shallowRef } from 'vue';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const state = shallowRef(ledger.state.value);
const stop = ledger.state.subscribe(() => { state.value = ledger.state.value; });

onUnmounted(() => {
  stop();
  ledger.dispose();
});
```

```ts [Ripple]
import { signal } from '@vielzeug/ripple';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const state = signal(ledger.state.value);
const stop = ledger.state.subscribe(() => { state.value = ledger.state.value; });

function dispose(): void {
  stop();
  ledger.dispose();
}
```

:::

## Working with Other Vielzeug Libraries

Use Keymap to route keyboard shortcuts into `undo()` and `redo()`. Project `ledger.state` into Ripple when reactive derivations are needed. Persist application snapshots with Vault; Ledger history itself is transient.

## Best Practices

- Capture previous and next values before submitting a command.
- Keep irreversible effects outside Ledger commands.
- Forward or check `context.signal` in asynchronous command work.
- Catch every operation promise at the application boundary.
- Read one `state` snapshot per render.
- Keep state subscribers synchronous and handle failures through the application's global error boundary.
- Use `whenIdle()` before releasing owners that require a drain boundary.
- Dispose each owner-scoped ledger.
