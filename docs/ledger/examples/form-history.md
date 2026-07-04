---
title: 'Ledger Examples — Form History'
description: 'Form History example for @vielzeug/ledger.'
---

## Form History

### Problem

A form with several fields needs undo/redo per field edit, with a history panel that lists what changed, and reactive undo/redo buttons that stay in sync with the stack.

### Solution

Track each field change as a labelled command via `ledger.do()`; bind `canUndo`/`canRedo`/`historySnapshot` with `effect()` from `@vielzeug/ripple`.

```ts
import { createLedger } from '@vielzeug/ledger';
import { effect } from '@vielzeug/ripple';

const ledger = createLedger({ maxHistory: 20 });

type FormData = { bio: string; email: string; name: string };

const form: FormData = { bio: '', email: '', name: '' };

function updateField<K extends keyof FormData>(field: K, next: FormData[K]): void {
  const prev = form[field];

  if (prev === next) return;

  ledger.do({
    execute: () => { form[field] = next; renderField(field); },
    label: `Edit ${field}`,
    rollback: () => { form[field] = prev; renderField(field); },
  });
}

// Hook form inputs
document.querySelectorAll<HTMLInputElement>('[data-field]').forEach((input) => {
  input.addEventListener('change', () => {
    updateField(input.dataset.field as keyof FormData, input.value);
  });
});

// Reactive undo/redo buttons
const undoBtn = document.getElementById('undo') as HTMLButtonElement;
const redoBtn = document.getElementById('redo') as HTMLButtonElement;

effect(() => {
  undoBtn.disabled = !ledger.canUndo.value;
  redoBtn.disabled = !ledger.canRedo.value;
});

undoBtn.addEventListener('click', () => ledger.undo());
redoBtn.addEventListener('click', () => ledger.redo());

// History list
effect(() => {
  const list = document.getElementById('history-list')!;
  list.innerHTML = ledger.historySnapshot.value
    .map((entry) => `<li>${entry.label ?? '(unlabelled)'}</li>`)
    .join('');
});

function renderField(field: keyof FormData): void {
  const input = document.querySelector<HTMLInputElement>(`[data-field="${field}"]`);
  if (input) input.value = form[field];
}
```

### Pitfalls

- `updateField` bails out early when `prev === next` — without that check, no-op edits (e.g. blur without a change) push a redundant undo step.
- The rollback in this recipe re-reads `prev` from a closure captured at command-creation time, not at execute time — capture `before`/`after` snapshots up front, don't compute them inside `execute`/`rollback`.

### Related

- [Text Editor History](./text-editor.md)
