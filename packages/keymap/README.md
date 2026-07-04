# @vielzeug/keymap

Headless keyboard shortcut manager with chord sequences, per-binding context guards, dynamic bindings, trigger control, conflict detection, and disposable lifecycle.

## Features

- **Chord sequences** — `"g g"`, `"ctrl+k ctrl+s"` with a configurable timeout
- **Special key aliases** — `space`, `esc`, `up`, `down`, `left`, `right`, `del`
- **Modifier aliases** — `cmd`/`command`/`win` → `meta`; `opt`/`option` → `alt`; `control` → `ctrl`; `mod` → `meta` on Mac, `ctrl` elsewhere
- **`modKey` option** — explicit platform override for cross-platform tests and SSR
- **Per-binding `BindingOptions`** — `{ handler, when?, trigger?, priority? }` object syntax
- **`trigger` option** — `'keydown'` (default) or `'keyup'` per binding
- **Dynamic bindings** — `map.bind()` / `map.unbind()` at any time — the most recent `bind()` for a shortcut always wins
- **`findShortcutConflicts()`** — detect prefix/duplicate conflicts before binding a user-customized shortcut
- **`formatShortcut()`** — platform-aware display formatter (`⇧⌘P` on Mac, `Ctrl+Shift+P` elsewhere)
- **`createKeymapLayer()`** — scoped keymap stack with `activate()` / `deactivate()`
- **Headless** — accepts any `EventTarget`; works without a DOM (SSR, Node tests)
- **Disposable** — `dispose()` + `[Symbol.dispose]` for `using` declarations

## Install

```sh
pnpm add @vielzeug/keymap
```

## Quick start

```typescript
import { createKeymap, formatShortcut } from '@vielzeug/keymap';

const map = createKeymap({
  'mod+k mod+s': () => save(),          // ⌘K⌘S on Mac, Ctrl+K Ctrl+S elsewhere
  'mod+shift+p': () => openPalette(),
  'g g':         () => goToTop(),
  esc:           { handler: closePanel, when: () => isPanelOpen() },
  space:         { handler: togglePlay, trigger: 'keyup' },
}, { modKey: 'ctrl' }); // explicit platform for tests / SSR

const unmount = map.mount(document);

// Dynamic bindings:
const unbind = map.bind('ctrl+z', () => undo());
unbind(); // or: map.unbind('ctrl+z')

// Display helper:
formatShortcut('mod+shift+p', 'meta'); // '⇧⌘P'
formatShortcut('mod+shift+p', 'ctrl'); // 'Ctrl+Shift+P'

// Cleanup:
unmount();     // remove from this target only
map.dispose(); // or: using map = createKeymap(…)
```

## Keymap layers

Stack keymaps for modal UI. Mount the base and the layer independently — each manages its own listeners:

```typescript
import { createKeymap, createKeymapLayer } from '@vielzeug/keymap';

const base = createKeymap({ 'ctrl+z': undo });
const modal = createKeymapLayer(base, {
  esc: { handler: closeModal, when: () => isModalOpen() },
});

const unmountBase = base.mount(document);
const unmountModal = modal.mount(document);

modal.deactivate(); // base handles everything; layer is suspended
modal.activate();   // layer takes over again

modal.parent === base; // true — parent reference is accessible

unmountModal();
unmountBase();
```

[Full docs →](https://vielzeug.dev/keymap/)
