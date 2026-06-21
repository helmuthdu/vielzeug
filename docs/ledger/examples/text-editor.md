---
title: Text Editor History
description: Implement per-keystroke undo/redo for a text editor with debouncing and Keymap shortcuts.
---

# Text Editor History

A minimal text-editor undo stack. Each edit is debounced so rapid keystrokes collapse into one undo step. Keyboard shortcuts are wired with Keymap.

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
