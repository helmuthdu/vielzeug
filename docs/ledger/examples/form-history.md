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

function renderHistory(): void {
  const { redo, undo } = ledger.state.value;
  undoButton.disabled = undo.length === 0;
  redoButton.disabled = redo.length === 0;
}

renderHistory();
const stop = ledger.state.subscribe(renderHistory);
```

### Pitfalls

- Await each field command before capturing the next prior value; Ledger serializes execution but cannot correct stale values captured by callers.
- Keep server saves and notifications outside the reversible command unless they have real compensators.
- Catch undo/redo promise failures at the UI boundary.
- State subscriptions are not immediate and receive no value; render once before subscribing.
- Stop the subscription and dispose the ledger with the form owner.

### Related

- [Text Editor History](./text-editor.md)
- [Ledger Usage Guide](../usage.md)
