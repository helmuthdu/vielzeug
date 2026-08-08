---
title: 'Ledger Examples — Form History'
description: 'Record reversible form field edits with @vielzeug/ledger.'
---

## Form History

### Problem

A form needs reversible field edits, history labels, and undo/redo controls driven from one state snapshot.

### Solution

Capture the old field value and submit a reversible command for each change.

```ts
import { createLedger } from '@vielzeug/ledger';
import { effect } from '@vielzeug/ripple';

const ledger = createLedger<{ field: string }>();
const form = { email: '', name: '' };

async function updateField(field: keyof typeof form, next: string): Promise<void> {
  const previous = form[field];

  if (previous === next) return;

  await ledger.do({
    apply: () => { form[field] = next; },
    label: `Edit ${field}`,
    meta: { field },
    revert: () => { form[field] = previous; },
  });
}

effect(() => {
  const { redo, undo } = ledger.state.value;
  undoButton.disabled = undo.length === 0;
  redoButton.disabled = redo.length === 0;
});
```

### Pitfalls

- Keep server saves and notifications outside the reversible command unless they have real compensators.
- Catch undo/redo promise failures at the UI boundary.
- Use `state.value.undo` for a history list; it is an atomic snapshot.

### Related

- [Text Editor History](./text-editor.md)
- [Ledger Usage Guide](../usage.md)
