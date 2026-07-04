---
title: 'Keymap Examples — Global Shortcuts'
description: 'Register document-level hotkeys with a context guard for @vielzeug/keymap.'
---

## Global Shortcuts

### Problem

You need common application shortcuts (save, undo, command palette) mounted once at the document
level, but they must stop firing while a modal dialog has focus — without manually unmounting and
remounting the keymap every time the modal opens or closes.

### Solution

Use the global `when()` option in `KeymapOptions`. It's re-evaluated on every `keydown`/`keyup`,
so toggling a plain boolean (or any predicate) takes effect immediately with no remount.

```ts
import { createKeymap } from '@vielzeug/keymap';

let modalOpen = false;

const map = createKeymap(
  {
    'ctrl+k':       () => openCommandPalette(),
    'ctrl+s':       () => saveDocument(),
    'ctrl+z':       () => undo(),
    'ctrl+shift+z': () => redo(),
    'ctrl+/':       () => toggleSidebar(),
  },
  {
    when: () => !modalOpen,
  },
);

const unmount = map.mount(document);

// Toggle the guard externally:
export function openModal() {
  modalOpen = true;
  showModal();
}

export function closeModal() {
  modalOpen = false;
  hideModal();
}
```

### Pitfalls

- `when: () => !modalOpen` closes over `modalOpen` by reference — reassigning the variable (not mutating a nested property) is what makes the guard pick up the new value on the next event.
- The global `when()` guard blocks every binding in the keymap, including ones that might be safe to use inside a modal (e.g. `ctrl+/`). Give the modal its own `createKeymapLayer()` (see the layers section in the [Usage Guide](/keymap/usage.md#keymap-layers)) if some shortcuts should remain active.
- Forgetting to call `unmount()` (or `map.dispose()`) on teardown leaks the `document`-level listeners for the lifetime of the page.

### Related

- [Vim-style Navigation](./vim-navigation.md)
- [Keymap Usage Guide — Context Guards](/keymap/usage.md#context-guards)
- [Keymap API Reference](/keymap/api.md)
