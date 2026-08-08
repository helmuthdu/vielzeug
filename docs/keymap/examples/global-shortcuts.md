---
title: 'Keymap Examples — Global Shortcuts'
description: 'Register document-level hotkeys with state and event-aware guards for @vielzeug/keymap.'
---

## Global Shortcuts

### Problem

You need document-level save, undo, and palette shortcuts. They must stop while a modal owns interaction without remounting listeners whenever modal state changes.

### Solution

Use global `when(event)` to re-evaluate application policy for every keyboard event.

```ts
import { createKeymap } from '@vielzeug/keymap';

let modalOpen = false;

const map = createKeymap(
  {
    'ctrl+k': () => openCommandPalette(),
    'ctrl+s': () => saveDocument(),
    'ctrl+z': () => undo(),
    'ctrl+shift+z': () => redo(),
    'ctrl+/': () => toggleSidebar(),
  },
  { when: () => !modalOpen },
);

const unmount = map.mount(document);

export function openModal() {
  modalOpen = true;
  showModal();
}

export function closeModal() {
  modalOpen = false;
  hideModal();
}

export function disposeShortcuts() {
  unmount();
  map.dispose();
}
```

### Preserve Native Text Editing

Inspect `event.composedPath()` when global undo and redo must yield to browser behavior inside editable fields. This matches Kanban app shell policy.

```ts
const isTypingInField = (event: KeyboardEvent): boolean =>
  event.composedPath().some(
    (target) =>
      target instanceof HTMLElement &&
      (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable),
  );

const editingMap = createKeymap(
  {
    'mod+z': () => undo(),
    'mod+shift+z': () => redo(),
  },
  { when: (event) => !isTypingInField(event) },
);
```

### Pitfalls

- `when()` runs for every event. Read current state inside callback instead of storing a stale boolean outside it.
- A global guard blocks every binding owned by that map. Create another `createKeymap()` owner with its own guard when some shortcuts remain active.
- Call both the returned `unmount()` callback and `map.dispose()` during owner teardown.

### Related

- [Vim-style Navigation](./vim-navigation.md)
- [Keymap Usage Guide — Context Guards](/keymap/usage.md#context-guards)
- [Keymap API Reference](/keymap/api.md)
