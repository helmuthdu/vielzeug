# @vielzeug/ledger

Async undo/redo command history with Ripple signals for reactive `canUndo`/`canRedo` state.

## Features

- **Async commands** — `execute` and `rollback` can return `Promise<void>`; operations are serialised
- **Reactive state** — `canUndo`, `canRedo`, `historySize`, `isProcessing`, `historySnapshot` are Ripple `Computed` values
- **Batch** — group multiple commands into one undo step
- **Max history** — configurable cap; oldest entries evicted automatically
- **Disposable** — `dispose()` + `[Symbol.dispose]` for `using` declarations

## Install

```sh
pnpm add @vielzeug/ledger
```

## Quick start

```typescript
import { createLedger } from '@vielzeug/ledger';
import { effect } from '@vielzeug/ripple';

const ledger = createLedger({ maxHistory: 50 });

// Execute a command
await ledger.do({
  execute: async () => { item.name = newName; },
  rollback: async () => { item.name = oldName; },
  label: 'Rename item',
});

// Undo / redo
await ledger.undo();
await ledger.redo();

// Batch — appears as one undo step
await ledger.batch([cmd1, cmd2, cmd3], { label: 'Multi-edit' });

// Bind to UI
effect(() => {
  undoButton.disabled = !ledger.canUndo.value;
  redoButton.disabled = !ledger.canRedo.value;
});

ledger.dispose(); // or: using ledger = createLedger()
```

[Full docs →](https://vielzeug.dev/ledger/)
