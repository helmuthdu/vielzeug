---
title: Ledger — Usage Guide
description: Use reversible commands, atomic state snapshots, cancellation, and lifecycle ownership with @vielzeug/ledger.
---

[[toc]]

## Basic Usage

Define both apply and revert before submitting a state transition.

```ts
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
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
ledger.dispose();
```

Irreversible work belongs in application code, not Ledger commands.

## Read State

Read one atomic state object for history and queue status.

```ts
import { effect } from '@vielzeug/ripple';

effect(() => {
  const { redo, running, undo } = ledger.state.value;

  undoButton.disabled = undo.length === 0;
  redoButton.disabled = redo.length === 0;
  spinner.hidden = running === 0;
});
```

`undo` and `redo` are chronological history arrays. The latest entry is the final array item.

## Compose Reversible Commands

Compose mutations only when each child can revert.

```ts
import { compose } from '@vielzeug/ledger';

await ledger.do(
  compose([
    { apply: () => { node.x = nextX; }, revert: () => { node.x = previousX; } },
    { apply: () => { node.y = nextY; }, revert: () => { node.y = previousY; } },
  ], 'Move node'),
);
```

If an apply step fails, completed steps revert in reverse order. Ledger preserves apply and compensation failures through `LedgerExecutionError.cause`.

## Handle Operation Failures

Catch rejected operations at the application boundary.

```ts
import { LedgerCancelledError, LedgerRollbackError } from '@vielzeug/ledger';

try {
  await ledger.undo();
} catch (error) {
  if (error instanceof LedgerCancelledError) return;
  if (error instanceof LedgerRollbackError) showUndoError(error.message);
  else throw error;
}
```

A failed revert remains in undo history for retry.

## Cancel Work

Pass an abort signal to cancel work before it starts or cooperatively stop active work.

```ts
const controller = new AbortController();

const save = ledger.do(
  {
    apply: async ({ signal }) => {
      await fetch('/api/save', { method: 'POST', signal });
    },
    revert: async () => {
      await fetch('/api/save', { method: 'DELETE' });
    },
  },
  { signal: controller.signal },
);

controller.abort();
await save.catch(reportHistoryError);
```

Commands that ignore an active abort signal continue until they settle. Use `whenIdle()` when an owner needs an awaitable drain boundary.

## Limit History

Configure a non-negative safe-integer history cap.

```ts
const ledger = createLedger({ maxHistory: 30 });
```

Use `maxHistory: 0` for serialized reversible commands without retained undo/redo history.

## Dispose Owners

Dispose seals the ledger, aborts active contexts, clears retained history, and rejects queued work that has not started.

```ts
const active = ledger.do({ apply: saveNext, revert: restorePrevious });
const idle = ledger.whenIdle();

ledger.dispose();
await active.catch(reportHistoryError);
await idle;
```

## Framework Integration

Create and dispose a ledger with framework ownership.

::: code-group

```tsx [React]
import { useEffect, useState } from 'react';

import { createLedger } from '@vielzeug/ledger';

export function UndoRedoButtons() {
  const [state, setState] = useState({ redo: 0, undo: 0 });

  useEffect(() => {
    const ledger = createLedger();
    const stop = ledger.state.subscribe(() => {
      const { redo, undo } = ledger.state.value;
      setState({ redo: redo.length, undo: undo.length });
    });

    return () => {
      stop();
      ledger.dispose();
    };
  }, []);

  return <span>{state.undo} undo / {state.redo} redo</span>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onUnmounted, ref } from 'vue';

import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const undoCount = ref(0);
const stop = ledger.state.subscribe(() => { undoCount.value = ledger.state.value.undo.length; });

onUnmounted(() => {
  stop();
  ledger.dispose();
});
</script>
```

```ts [Svelte]
import { onMount } from 'svelte';

import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
let undoCount = 0;

onMount(() => {
  const stop = ledger.state.subscribe(() => { undoCount = ledger.state.value.undo.length; });

  return () => {
    stop();
    ledger.dispose();
  };
});
```

:::

## Working with Other Vielzeug Libraries

### Ledger + Keymap

Route key handlers through one error boundary.

```ts
import { createKeymap } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const reportHistoryError = (error: unknown): void => console.error(error);
const map = createKeymap({
  'ctrl+z': () => void ledger.undo().catch(reportHistoryError),
  'ctrl+shift+z': () => void ledger.redo().catch(reportHistoryError),
});

map.mount(document);
```

## Best Practices

- **Submit** only commands with real revert behavior.
- **Snapshot** state before command submission.
- **Catch** operation promises at application boundaries.
- **Check** `state.value` for history and operation status.
- **Use** `whenIdle()` before releasing owners that need a drain boundary.
- **Keep** irreversible effects outside Ledger commands.
- **Dispose** ledger owners during framework teardown.
