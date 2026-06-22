---
title: Ledger — Usage Guide
description: How to use createLedger for undo/redo, async commands, batch operations, and reactive UI binding.
---

# Usage Guide

## Basic Usage

Define commands as `{ execute, rollback }` pairs and push them through `ledger.do()`:

```ts
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();

const prev = item.name;
const next = 'New name';

await ledger.do({
  execute: async () => { item.name = next; },
  rollback: async () => { item.name = prev; },
  label: 'Rename item',
});

await ledger.undo(); // item.name === prev
await ledger.redo(); // item.name === next
```

Commands can be sync or async — both `() => void` and `() => Promise<void>` are accepted.

## Reactive State

`canUndo`, `canRedo`, `historySize`, `isProcessing`, and `historySnapshot` are Ripple `Computed` values. Read them directly in effects or templates:

```ts
import { effect } from '@vielzeug/ripple';

effect(() => {
  undoButton.disabled = !ledger.canUndo.value;
  redoButton.disabled = !ledger.canRedo.value;
  spinner.hidden = !ledger.isProcessing.value;
});
```

Or read `.value` imperatively:

```ts
console.log(ledger.historySize.value);      // number of undo steps
console.log(ledger.historySnapshot.value);  // readonly CommandMeta[]
```

## Composing Commands

Group multiple commands into a single undo step with `compose()`. Rollback runs all sub-commands in reverse:

```ts
import { compose, createLedger } from '@vielzeug/ledger';

await ledger.do(compose(
  [
    { execute: () => { node.x = newX; }, rollback: () => { node.x = oldX; } },
    { execute: () => { node.y = newY; }, rollback: () => { node.y = oldY; } },
    { execute: () => { node.width = newW; }, rollback: () => { node.width = oldW; } },
  ],
  'Move and resize',
));

// One undo step undoes all three:
await ledger.undo();
```

## Concurrent Safety

All operations — `do()`, `undo()`, and `redo()` — are serialised through an internal queue. Concurrent calls are queued, not rejected:

```ts
// Safe to call without awaiting each:
ledger.do(cmd1);
ledger.do(cmd2);
ledger.do(cmd3);
// cmd1 → cmd2 → cmd3 execute in order
```

`isProcessing.value` is `true` while a command's `execute` or `rollback` is actively running. Use `pendingCount.value > 0` to check whether there are any operations in the queue (including those waiting to start).

## History Cap

Limit the undo stack size with `maxHistory` (default: `100`):

```ts
const ledger = createLedger({ maxHistory: 30 });
```

When the limit is reached, the oldest undo entry is silently evicted. The redo stack is always cleared when a new `do()` is performed.

## Custom Command Data

Attach arbitrary metadata to a command with the `data` field. Use `createLedger<TData>()` to type it:

```ts
type EditData = { before: string; after: string };

const ledger = createLedger<EditData>();

await ledger.do({
  data: { before: item.name, after: newName },
  execute: () => { item.name = newName; },
  rollback: () => { item.name = item.name; }, // captured in closure
  label: 'Rename item',
});

const [latest] = ledger.historySnapshot.value;
console.log(latest.data?.before); // string | undefined — fully typed
```

`data` is stored as-is and does not affect `execute` or `rollback` behaviour.

## Error Handling

If `execute()` rejects, the command is **not** added to the undo stack:

```ts
await ledger.do({
  execute: async () => {
    await api.save(item); // throws if server error
  },
  rollback: async () => { /* not reached */ },
});
// ledger.historySize.value unchanged
```

If `rollback()` throws during `undo()`, a dev warning is issued and the stack position is left unchanged — the entry stays on the undo stack so the operation can be retried.

To receive rollback errors in your application code (for example, to show a notification), pass `onRollbackError` to `createLedger`:

```ts
const ledger = createLedger({
  onRollbackError: (err, meta) => {
    notify(`Could not undo "${meta.label ?? 'action'}": ${String(err)}`);
  },
});
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useState } from 'react';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();

function UndoRedoButtons() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unsub = ledger.canUndo.subscribe(({ newValue }) => setCanUndo(newValue));
    const unsub2 = ledger.canRedo.subscribe(({ newValue }) => setCanRedo(newValue));
    return () => { unsub(); unsub2(); };
  }, []);

  return (
    <>
      <button disabled={!canUndo} onClick={() => ledger.undo()}>Undo</button>
      <button disabled={!canRedo} onClick={() => ledger.redo()}>Redo</button>
    </>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const canUndo = ref(false);
const canRedo = ref(false);

const u1 = ledger.canUndo.subscribe(({ newValue }) => { canUndo.value = newValue; });
const u2 = ledger.canRedo.subscribe(({ newValue }) => { canRedo.value = newValue; });
onUnmounted(() => { u1(); u2(); });
</script>

<template>
  <button :disabled="!canUndo" @click="ledger.undo()">Undo</button>
  <button :disabled="!canRedo" @click="ledger.redo()">Redo</button>
</template>
```

```ts [Svelte]
import { onMount } from 'svelte';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
let canUndo = false;
let canRedo = false;

onMount(() => {
  const u1 = ledger.canUndo.subscribe(({ newValue }) => { canUndo = newValue; });
  const u2 = ledger.canRedo.subscribe(({ newValue }) => { canRedo = newValue; });
  return () => { u1(); u2(); };
});
```

:::

## Working with Other Vielzeug Libraries

### Ledger + Keymap

```ts
import { createKeymap } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const map = createKeymap({
  'ctrl+z':       () => ledger.undo(),
  'ctrl+shift+z': () => ledger.redo(),
  'ctrl+y':       () => ledger.redo(), // Windows alias
});
map.mount(document);
```

### Ledger + Ripple effect

```ts
import { effect } from '@vielzeug/ripple';

effect(() => {
  document.title = ledger.canUndo.value
    ? `● ${documentTitle}` // unsaved indicator
    : documentTitle;
});
```

## Best Practices

- **Capture state before mutation**: close over `prev` / `next` values at `do()` call time, not inside `execute`/`rollback`.
- **Label meaningful operations**: `historySnapshot.value` exposes labels for undo history lists.
- **Use `data` for rich history UIs**: store before/after snapshots or affected IDs in `Command.data`; retrieve them via `historySnapshot.value[n].data`.
- **Await `clear()` when order matters**: `ledger.clear()` is serialised — it returns a `Promise` that resolves after any in-flight operation finishes.
- **Dispose when done**: call `ledger.dispose()` when the owner component unmounts — it clears both stacks and disposes all signals.
- **Avoid reading `.value` after `dispose()`**: the computed nodes are disposed; `.value` returns `undefined`.
