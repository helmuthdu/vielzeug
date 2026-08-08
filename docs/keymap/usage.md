---
title: Keymap — Usage Guide
description: Bind keyboard shortcuts, chords, event-aware guards, and target-local listeners with @vielzeug/keymap.
---

[[toc]]

## Basic Usage

Mount one keymap, then release its target listener and dispose its owner during teardown.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({
  'ctrl+s': () => console.log('save'),
  'ctrl+z': () => console.log('undo'),
  escape: () => console.log('close'),
});

const unmount = map.mount(document);

// Call this when the owning UI scope ends.
unmount();
map.dispose();
```

`unmount()` only releases that target. `dispose()` releases every target, aborts `disposalSignal`, and makes `bind()`, `unbind()`, and `mount()` unavailable.

## Modifier Aliases

Use aliases to accept platform terminology while Keymap stores one canonical shortcut.

| Input | Canonical modifier |
| --- | --- |
| `cmd`, `command`, `win` | `meta` |
| `opt`, `option` | `alt` |
| `ctrl`, `control` | `ctrl` |
| `mod` | `meta` on Mac; `ctrl` elsewhere |

Pass `modKey` when rendering or testing a specific platform.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap(
  { 'mod+k': () => console.log('open palette') },
  { modKey: 'ctrl' },
);

map.mount(document);
```

## Chord Sequences

Separate chord steps with spaces. Keymap resets an incomplete sequence after `chordTimeout` milliseconds.

```ts
const map = createKeymap(
  {
    'ctrl+k ctrl+s': () => console.log('save'),
    'g g': () => window.scrollTo({ top: 0 }),
    'g e': () => window.scrollTo({ top: document.body.scrollHeight }),
  },
  { chordTimeout: 800 },
);
```

Do not bind a complete shortcut and a longer chord beginning with that shortcut. `g` fires immediately, so `g g` cannot complete. Check proposed user bindings with `findShortcutConflicts()`.

## Binding Options

Add a guard or choose `keyup` with `BindingOptions`.

```ts
const map = createKeymap({
  'ctrl+s': () => saveDocument(),
  escape: { handler: closePanel, when: (event) => event.target === panel },
  space: { handler: togglePlayback, trigger: 'keyup' },
});
```

A matching binding calls `preventDefault()` by default. Set `preventDefault: false` for shortcuts that must retain browser behavior.

## Context Guards

Use global `when(event)` for policy shared by every binding. Use per-binding `when(event)` when one shortcut needs a narrower policy.

```ts
const map = createKeymap(
  {
    escape: { handler: closePanel, when: (event) => event.target === panel },
    'ctrl+s': () => saveDocument(),
  },
  { when: (event) => !modalIsOpen() && event.isTrusted },
);
```

Zero-argument callbacks continue to work. Accept `KeyboardEvent` when guard logic needs target, modifier, composition, or shadow-DOM context.

### Preserve Native Text Editing

Use `event.composedPath()` to keep browser undo and redo inside inputs, textareas, and `contenteditable` elements. Kanban app shell uses this policy for its global undo and redo shortcuts.

```ts
const isTypingInField = (event: KeyboardEvent): boolean =>
  event.composedPath().some(
    (target) =>
      target instanceof HTMLElement &&
      (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable),
  );

const map = createKeymap(
  {
    'mod+z': () => undo(),
    'mod+shift+z': () => redo(),
  },
  { when: (event) => !isTypingInField(event) },
);
```

Do not make editable-field suppression a hidden package default. Applications may intentionally bind shortcuts inside editable controls.

## Trigger Control

Bind on `keyup` when an action must run after key release.

```ts
const map = createKeymap({
  space: { handler: confirmAction, trigger: 'keyup' },
});
```

`keydown` and `keyup` maintain independent chord state.

## Replace Bindings at Runtime

Bind replaces an existing binding with same canonical shortcut and returns a targeted removal callback.

```ts
const map = createKeymap({ 'ctrl+k': defaultAction });
const removePluginBinding = map.bind('ctrl+k', pluginAction);

removePluginBinding();
map.bind('ctrl+k', defaultAction);
```

`unbind(shortcut)` removes canonicalized aliases and warns in development when no binding exists.

## Format Shortcut Labels

Format labels with explicit platform behavior when your UI is cross-platform.

```ts
import { formatShortcut } from '@vielzeug/keymap';

console.log(formatShortcut('mod+shift+p', 'meta')); // ⇧⌘P
console.log(formatShortcut('mod+shift+p', 'ctrl')); // Ctrl+Shift+P
```

`formatShortcut()` returns `''` and emits a development warning for invalid input.

## Detect Conflicts

Check a custom shortcut before binding it to prevent duplicate or unreachable chord paths.

```ts
import { createKeymap, findShortcutConflicts } from '@vielzeug/keymap';

const map = createKeymap({ g: () => scrollToTop() });
const conflicts = findShortcutConflicts('g g', map.listBindings());

if (conflicts.length === 0) map.bind('g g', () => scrollToBottom());
```

Conflict detection compares only bindings with same trigger. An empty proposal returns no conflicts; other invalid proposals throw `KeymapParseError`.

## Mount Targets

Mount one keymap on multiple independent targets when each target should own its own chord progression.

```ts
const map = createKeymap({ 'g g': () => console.log('go to top') });
const unmountEditor = map.mount(editor);
const unmountPreview = map.mount(preview);
```

A chord started on `editor` cannot complete on `preview`. Repeated `mount(editor)` calls share one listener and require one unmount call each. For nested targets, Keymap handles one bubbled event at its innermost mounted target.

## Scoped Maps

Create separate keymaps for separate UI owners. If maps share a target and shortcut, guards must be mutually exclusive because Keymap has no implicit layer precedence.

```ts
const baseMap = createKeymap(
  { escape: () => closeSidebar() },
  { when: () => !modalIsOpen() },
);

const modalMap = createKeymap(
  { escape: () => closeModal() },
  { when: () => modalIsOpen() },
);

const unmountBase = baseMap.mount(document);
const unmountModal = modalMap.mount(document);
```

## Testing

Dispatch `KeyboardEvent` instances against a mounted DOM target to test handlers and default prevention.

```ts
import { expect, it, vi } from 'vitest';

import { createKeymap } from '@vielzeug/keymap';

it('handles save', () => {
  const save = vi.fn();
  const target = document.createElement('button');
  const map = createKeymap({ 'ctrl+s': save });
  const unmount = map.mount(target);

  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, key: 's' }));

  expect(save).toHaveBeenCalledOnce();
  unmount();
  map.dispose();
});
```

Mount nested DOM targets in tests when your application uses both a container and a descendant listener. This verifies one bubbled event cannot complete a chord twice.

## Framework Integration

Create map during framework lifecycle, then dispose it during teardown.

::: code-group

```tsx [React]
import { useEffect } from 'react';

import { createKeymap } from '@vielzeug/keymap';

export function App() {
  useEffect(() => {
    const map = createKeymap({ 'ctrl+k': () => console.log('open palette') });
    const unmount = map.mount(document);

    return () => {
      unmount();
      map.dispose();
    };
  }, []);

  return null;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({ escape: () => console.log('close palette') });
let unmount: (() => void) | undefined;

onMounted(() => {
  unmount = map.mount(document);
});

onUnmounted(() => {
  unmount?.();
  map.dispose();
});
</script>
```

```ts [Svelte]
import { onMount } from 'svelte';

import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({ escape: () => console.log('close palette') });

onMount(() => {
  const unmount = map.mount(document);

  return () => {
    unmount();
    map.dispose();
  };
});
```

:::

## Working with Other Vielzeug Libraries

### Keymap + Ledger

Connect undo and redo handlers to a Ledger owner.

```ts
import { createKeymap } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';

const ledger = createLedger();
const map = createKeymap({
  'mod+z': () => void ledger.undo(),
  'mod+shift+z': () => void ledger.redo(),
});

map.mount(document);
```

### Keymap + Herald

Emit domain events instead of calling application actions from shortcut handlers.

```ts
import { createBus } from '@vielzeug/herald';
import { createKeymap } from '@vielzeug/keymap';

const bus = createBus<{ 'shortcut:save': void }>();
const map = createKeymap({
  'ctrl+s': () => bus.emit('shortcut:save'),
});

map.mount(document);
```

## Best Practices

- **Dispose** every map when its owner ends.
- **Unmount** temporary target listeners instead of disposing reusable maps.
- **Guard** global text-editing shortcuts with `event.composedPath()`.
- **Check** conflicts before accepting customized shortcuts.
- **Keep** shared-target guards mutually exclusive.
- **Use** `mod` for primary cross-platform shortcuts.
- **Avoid** prefix pairs such as `g` and `g g`.
