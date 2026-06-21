---
title: Global Shortcuts
description: Register document-level hotkeys with a guard that disables them while a modal is open.
---

# Global Shortcuts

Register common application shortcuts at the document level. The `when()` guard prevents them from firing while a modal is open.

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

The guard is evaluated on every `keydown`, so toggling `modalOpen` takes effect immediately — no remounting required.
