---
title: Form History
description: Reversible form field mutations with reactive undo/redo buttons using Ledger and Ripple.
---

# Form History

Track field changes as named commands. Each field update is one undo step; the history panel shows labels.

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
