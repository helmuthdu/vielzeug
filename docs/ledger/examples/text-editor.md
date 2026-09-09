---
title: 'Ledger Examples — Text Editor History'
description: 'Record debounced reversible text edits with @vielzeug/ledger.'
---

## Text Editor History

### Problem

Per-keystroke history creates too many undo entries. Keyboard handlers must also catch asynchronous Ledger failures.

### Solution

Capture the value before each debounced edit, then submit one reversible command.

```ts
import { createKeymap } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const textarea = document.getElementById('editor') as HTMLTextAreaElement;
let committed = textarea.value;

function recordEdit(next: string): Promise<void> {
  const before = committed;

  return ledger.do({
    apply: () => { textarea.value = next; committed = next; },
    label: 'Type',
    revert: () => { textarea.value = before; committed = before; },
  });
}

const reportHistoryError = (error: unknown): void => recordHistoryFailure(error);
const map = createKeymap([
  { id: 'undo', shortcut: 'ctrl+z', handler: () => void ledger.undo().catch(reportHistoryError) },
  { id: 'redo', shortcut: 'ctrl+shift+z', handler: () => void ledger.redo().catch(reportHistoryError) },
]);

map.mount(textarea);

function disposeEditor(): void {
  map.dispose();
  ledger.dispose();
}
```

### Pitfalls

- Capture the prior value before submitting the command.
- Keep debouncing outside Ledger; Ledger records the reversible transition, not input timing.
- Dispose the keymap and ledger with the editor owner.

### Related

- [Form History](./form-history.md)
- [Ledger Usage Guide](../usage.md)
