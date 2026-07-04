---
title: 'Ledger Examples — Text Editor History'
description: 'Text Editor History example for @vielzeug/ledger.'
---

## Text Editor History

### Problem

Per-keystroke undo for a text editor would create one undo step per character — undo would need dozens of presses to undo a single sentence. Keyboard shortcuts (`ctrl+z` / `ctrl+shift+z`) also need wiring.

### Solution

Debounce `input` events so a burst of keystrokes collapses into one `ledger.do()` call, and wire `ctrl+z`/`ctrl+shift+z` with `@vielzeug/keymap`.

```ts
import { createKeymap } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';
import { effect } from '@vielzeug/ripple';

const ledger = createLedger({ maxHistory: 100 });
const textarea = document.getElementById('editor') as HTMLTextAreaElement;

let lastValue = textarea.value;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let burstStart: string | null = null; // value before the current typing burst

textarea.addEventListener('input', () => {
  const next = textarea.value;
  if (debounceTimer === null) {
    burstStart = lastValue; // first keystroke of burst — snapshot pre-burst state
  }
  clearTimeout(debounceTimer!);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const prev = burstStart!;
    burstStart = null;
    lastValue = next;
    ledger.do({
      execute: () => { textarea.value = next; },
      rollback: () => { textarea.value = prev; },
      label: 'Type',
    });
  }, 300);
});

// Wire keyboard shortcuts
const map = createKeymap({
  'ctrl+z':       () => ledger.undo(),
  'ctrl+shift+z': () => ledger.redo(),
  'ctrl+y':       () => ledger.redo(),
});
map.mount(textarea);

// Reactive toolbar buttons
effect(() => {
  (document.getElementById('undo-btn') as HTMLButtonElement).disabled = !ledger.canUndo.value;
  (document.getElementById('redo-btn') as HTMLButtonElement).disabled = !ledger.canRedo.value;
});
```

### Pitfalls

- Snapshot `burstStart` on the **first** keystroke of a burst, not the last — otherwise rollback restores the wrong (mid-burst) value.
- `ctrl+y` is a Windows-only redo alias; don't rely on it as the only redo shortcut on macOS/Linux.

### Related

- [Form History](./form-history.md)
