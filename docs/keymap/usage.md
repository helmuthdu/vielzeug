---
title: Keymap — Usage Guide
description: How to use createKeymap for single shortcuts, chord sequences, context guards, and framework integration.
---

# Usage Guide

## Basic Shortcuts

Pass a record of shortcut strings to handlers:

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({
  'ctrl+s':     () => save(),
  'ctrl+z':     () => undo(),
  'ctrl+shift+z': () => redo(),
  'escape':     () => closeModal(),
});

const unmount = map.mount(document);
```

The returned `unmount` function detaches listeners from that target only. Call `map.dispose()` to remove from all mounted targets at once.

## Modifier Aliases

You can write shortcuts in the style that feels natural — Keymap normalises everything:

| You write | Canonical form |
| --------- | -------------- |
| `cmd`, `command`, `win` | `meta` |
| `opt`, `option` | `alt` |
| `ctrl`, `control` | `ctrl` |
| `shift` | `shift` |

```ts
// All three are equivalent:
createKeymap({ 'cmd+k':     handler });
createKeymap({ 'command+k': handler });
createKeymap({ 'meta+k':    handler });
```

## Chord Sequences

Separate chord steps with a space. The default timeout between steps is 1 s:

```ts
const map = createKeymap({
  'ctrl+k ctrl+s': () => save(),   // VS Code–style
  'g g':           () => goToTop(), // Vim-style
  'g G':           () => goToBottom(),
}, {
  chordTimeout: 750, // ms — reset partial chord if exceeded
});
```

> **Tip:** Keymap fires the first fully-matched binding when multiple bindings share a prefix. Order your bindings from most-specific to least-specific.

## `BindingOptions` — Per-binding Configuration

Pass a `BindingOptions` object instead of a plain handler to add guards, trigger control, or priority:

```ts
const map = createKeymap({
  'ctrl+s': () => save(),                                   // plain handler
  escape:   { handler: closePanel, when: () => isOpen() },  // per-binding guard
  space:    { handler: togglePlay, trigger: 'keyup' },       // fires on keyup
  'ctrl+z': { handler: undo, priority: 10 },                 // wins over lower-priority bindings
});
```

## Context Guards

Use a global `when()` in `KeymapOptions` to disable an entire keymap conditionally:

```ts
const map = createKeymap(
  { escape: () => closePanel() },
  { when: () => panelIsOpen() },
);
```

For per-binding guards, use `BindingOptions.when`:

```ts
const map = createKeymap({
  escape:    { handler: closePanel, when: () => isPanelOpen() },
  backspace: { handler: deleteLine, when: () => isEditorFocused() },
});
```

## Trigger Control

Bindings default to `keydown`. Use `trigger: 'keyup'` for actions that should fire on release:

```ts
const map = createKeymap({
  space: { handler: confirmAction, trigger: 'keyup' },
});
```

Keydown and keyup chord trackers are independent — a `'g g'` chord on `keyup` does not interfere with a `'g g'` chord on `keydown`.

## Priority

When multiple bindings share an overlapping shortcut (e.g. bound via `bind()` at different points in time), the one with the highest `priority` fires:

```ts
const map = createKeymap({
  'ctrl+k': { handler: defaultAction, priority: 0 },
});

// A plugin registers a higher-priority override at runtime:
map.bind('ctrl+k', { handler: pluginOverride, priority: 10 }); // wins
```

## Display with `formatShortcut`

Format shortcut strings for display in tooltips, menus, or documentation:

```ts
import { formatShortcut } from '@vielzeug/keymap';

formatShortcut('mod+shift+p', 'meta'); // '⇧⌘P'
formatShortcut('mod+shift+p', 'ctrl'); // 'Ctrl+Shift+P'
formatShortcut('ctrl+k ctrl+s');       // platform-detected
```

Returns `''` and emits a dev warning for empty or invalid shortcuts.

## Keymap Layers

Stack a scoped keymap on top of a base keymap for modal UIs. Mount each independently:

```ts
import { createKeymap, createKeymapLayer } from '@vielzeug/keymap';

const base = createKeymap({ 'ctrl+z': undo, 'ctrl+s': save });
const modal = createKeymapLayer(base, {
  escape: { handler: closeModal, when: () => isModalOpen() },
  'ctrl+enter': () => confirm(),
});

const unmountBase = base.mount(document);
const unmountModal = modal.mount(document);

modal.deactivate(); // base handles everything; layer is suspended
modal.activate();   // layer resumes

modal.parent === base; // true

unmountModal();
unmountBase();
```

## Mounting to a Specific Element

Pass any `EventTarget` — not just `document`:

```ts
const editorEl = document.getElementById('editor')!;
const unmount = map.mount(editorEl); // only fires when focus is inside editor
```

One keymap can be mounted to multiple targets simultaneously:

```ts
const u1 = map.mount(editorA);
const u2 = map.mount(editorB);
// u1() removes from editorA only
// map.dispose() removes from both
```

## `preventDefault` and `stopPropagation`

```ts
const map = createKeymap(
  { 'ctrl+s': () => save() },
  {
    preventDefault: true,   // default: true — prevents browser save dialog
    stopPropagation: false, // default: false
  },
);
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createKeymap } from '@vielzeug/keymap';

function App() {
  useEffect(() => {
    const map = createKeymap({
      'ctrl+k': () => setOpen(true),
      'escape': () => setOpen(false),
    });
    const unmount = map.mount(document);
    return () => unmount();
  }, []);
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({
  'ctrl+k': () => openPalette(),
  'escape': () => closePalette(),
});

let unmount: (() => void) | undefined;
onMounted(() => { unmount = map.mount(document); });
onUnmounted(() => unmount?.());
</script>
```

```ts [Svelte]
import { onMount } from 'svelte';
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({
  'ctrl+k': () => openPalette(),
  'escape': () => closePalette(),
});

onMount(() => {
  const unmount = map.mount(document);
  return () => unmount();
});
```

:::

## Working with Other Vielzeug Libraries

### Keymap + Ledger

Wire undo/redo shortcuts to a `Ledger` instance:

```ts
import { createKeymap } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const map = createKeymap({
  'ctrl+z':       () => ledger.undo(),
  'ctrl+shift+z': () => ledger.redo(),
  'ctrl+y':       () => ledger.redo(), // Windows alias
});
map.mount(document);
```

### Keymap + Herald

Publish shortcut events to a bus instead of calling handlers directly:

```ts
import { createKeymap } from '@vielzeug/keymap';
import { createBus } from '@vielzeug/herald';

const bus = createBus<{ 'shortcut:save': void; 'shortcut:palette': void }>();
const map = createKeymap({
  'ctrl+s':       () => bus.emit('shortcut:save'),
  'meta+shift+p': () => bus.emit('shortcut:palette'),
});
map.mount(document);
```

## Best Practices

- **One keymap per scope**: create separate keymaps for global shortcuts, panel shortcuts, and editor shortcuts — mount/unmount them as the relevant UI state changes.
- **Dispose on teardown**: always call `unmount()` or `map.dispose()` when the component unmounts or the scope is destroyed.
- **Avoid modifier-only shortcuts**: shortcuts like `shift` alone (no key) can't be reliably parsed — always include a non-modifier key.
- **Use `when()` for toggleable scopes**: simpler than manually mounting and unmounting on every state change.
