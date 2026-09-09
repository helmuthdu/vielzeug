---
title: Keymap — Usage Guide
description: Bind keyboard shortcuts, chords, event-aware guards, and target-local listeners with @vielzeug/keymap.
---

[[toc]]

## Basic Usage

Mount one keymap, then release its target listener and dispose its owner during teardown.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap([
  { id: 'save', shortcut: 'ctrl+s', handler: () => console.log('save') },
  { id: 'undo', shortcut: 'ctrl+z', handler: () => console.log('undo') },
  { id: 'close', shortcut: 'escape', handler: () => console.log('close') },
]);

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
  [{ id: 'palette', shortcut: 'mod+k', handler: () => console.log('open palette') }],
  { modKey: 'ctrl' },
);

map.mount(document);
```

## Chord Sequences

Separate chord steps with spaces. Keymap resets an incomplete sequence after `chordTimeout` milliseconds.

```ts
const map = createKeymap(
  [
    { id: 'save', shortcut: 'ctrl+k ctrl+s', handler: () => console.log('save') },
    { id: 'top', shortcut: 'g g', handler: () => window.scrollTo({ top: 0 }) },
    { id: 'end', shortcut: 'g e', handler: () => window.scrollTo({ top: document.body.scrollHeight }) },
  ],
  { chordTimeout: 800 },
);
```

Do not bind a complete shortcut and a longer chord beginning with that shortcut. `g` fires immediately, so `g g` cannot complete. Check proposed user bindings with `findShortcutConflicts()`.

## Binding Options

Each binding is an object with an explicit `id`, `shortcut`, and `handler`. Add a guard, choose `keyup`, or control event behavior with optional fields.

```ts
const map = createKeymap([
  { id: 'save', shortcut: 'ctrl+s', handler: () => saveDocument() },
  { id: 'close', shortcut: 'escape', handler: closePanel, when: (event) => event.target === panel },
  { id: 'play', shortcut: 'space', handler: togglePlayback, trigger: 'keyup' },
  { id: 'inspect', shortcut: 'f12', handler: inspectElement, preventDefault: false },
]);
```

### Per-Binding preventDefault and stopPropagation

Each binding controls `preventDefault` and `stopPropagation` independently:

- `preventDefault` defaults to `true` — completed shortcuts and matched chord prefixes suppress browser defaults.
- `stopPropagation` defaults to `false` — events continue bubbling unless explicitly stopped.

Set `preventDefault: false` for shortcuts that must coexist with native controls (e.g. developer tools, accessibility features).

## Context Guards

Use global `when(event)` for policy shared by every binding. Use per-binding `when(event)` when one shortcut needs a narrower policy.

```ts
const map = createKeymap(
  [
    { id: 'close', shortcut: 'escape', handler: closePanel, when: (event) => event.target === panel },
    { id: 'save', shortcut: 'ctrl+s', handler: () => saveDocument() },
  ],
  { when: (event) => !modalIsOpen() && event.isTrusted },
);
```

Accept `KeyboardEvent` when guard logic needs target, modifier, composition, or shadow-DOM context.

### Guard Composition: Global + Per-Binding

When you provide both a global `when` (in `KeymapOptions`) and per-binding `when` guards, both must return `true` for the handler to fire. This is AND composition.

**Guard evaluation and chord tracking order:**

1. **Global guard runs first.** If it returns `false`, the target's pending chord state resets.
2. **Per-binding guards select candidates.** A binding participates in each chord step only while its guard passes.
3. **Chord state advances for eligible candidates.** The first completed candidate in binding order runs.

A chord cannot begin while its map is disabled and finish after the global guard becomes active.

```ts
const map = createKeymap(
  [
    { id: 'close', shortcut: 'escape', handler: closePanel, when: (event) => event.target === panel },
    { id: 'save', shortcut: 'ctrl+s', handler: () => saveDocument() },
  ],
  { when: (event) => !isModalOpen() && event.isTrusted },
);

// Global guard runs first; if false, both bindings are skipped (handler doesn't fire).
// If global passes:
//   - 'save' handler fires immediately.
//   - 'close' handler fires only if event.target is the panel.
```

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
  [
    { id: 'undo', shortcut: 'mod+z', handler: () => undo() },
    { id: 'redo', shortcut: 'mod+shift+z', handler: () => redo() },
  ],
  { when: (event) => !isTypingInField(event) },
);
```

Do not make editable-field suppression a hidden package default. Applications may intentionally bind shortcuts inside editable controls.

## Trigger Control

Bind on `keyup` when an action must run after key release.

```ts
const map = createKeymap([
  { id: 'confirm', shortcut: 'space', handler: confirmAction, trigger: 'keyup' },
]);
```

`keydown` and `keyup` maintain independent chord state.

## Replace Bindings at Runtime

`bind(binding)` adds or replaces a binding with the same `id` and returns a targeted removal callback.

```ts
const map = createKeymap([{ id: 'palette', shortcut: 'ctrl+k', handler: defaultAction }]);
const removePluginBinding = map.bind({ id: 'palette', shortcut: 'ctrl+k', handler: pluginAction });

removePluginBinding();
map.bind({ id: 'palette', shortcut: 'ctrl+k', handler: defaultAction });
```

`unbind(id)` removes the binding with that id and warns in development when no binding exists.

### Duplicate Shortcuts with Different IDs

Each binding has an explicit `id`, so duplicate shortcuts can coexist. Keymap evaluates them in insertion order and fires the first binding whose guard passes.

```ts
const map = createKeymap([
  { id: 'primary', shortcut: 'ctrl+k', handler: primaryAction },
  { id: 'fallback', shortcut: 'ctrl+k', handler: fallbackAction },
]);

// 'primary' fires while eligible; use mutually exclusive guards for contextual fallback.
```

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

const map = createKeymap([{ id: 'top', shortcut: 'g', handler: () => scrollToTop() }]);
const conflicts = findShortcutConflicts('g g', map.listBindings());

if (conflicts.length === 0) map.bind({ id: 'bottom', shortcut: 'g g', handler: () => scrollToBottom() });
```

Conflict detection compares only bindings with same trigger. An empty proposal returns no conflicts; other invalid proposals throw `KeymapParseError`.

## Parser Subpath

For custom tooling, validators, or framework integrations that need direct access to the shortcut parser, import from `@vielzeug/keymap/parse`:

```ts
import { parseShortcut, parseStep, matchStep, canonicalizeShortcut, detectModKey } from '@vielzeug/keymap/parse';

const steps = parseShortcut('ctrl+k ctrl+s', 'ctrl');
const step = parseStep('ctrl+k', 'ctrl');
const isMatch = matchStep(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }), steps[0]);
```

These functions are not exported from the root entry point to keep the common API surface small.

## Mount Targets

Mount one keymap on multiple independent targets when each target should own its own chord progression.

```ts
const map = createKeymap([{ id: 'top', shortcut: 'g g', handler: () => console.log('go to top') }]);
const unmountEditor = map.mount(editor);
const unmountPreview = map.mount(preview);
```

A chord started on `editor` cannot complete on `preview`. Repeated `mount(editor)` calls share one listener and require one unmount call each. For nested targets, Keymap handles one bubbled event at its innermost mounted target.

## Scoped Maps

Create separate keymaps for separate UI owners. If maps share a target and shortcut, guards must be mutually exclusive because Keymap has no implicit layer precedence.

```ts
const baseMap = createKeymap(
  [{ id: 'close-sidebar', shortcut: 'escape', handler: () => closeSidebar() }],
  { when: () => !modalIsOpen() },
);

const modalMap = createKeymap(
  [{ id: 'close-modal', shortcut: 'escape', handler: () => closeModal() }],
  { when: () => modalIsOpen() },
);

const unmountBase = baseMap.mount(document);
const unmountModal = modalMap.mount(document);
```

## Observe Chord Activity

Use `tap()` for chord hints, diagnostics, and matched-binding telemetry. Observers cannot alter shortcut behavior.

```ts
const stopTrace = map.tap((event) => {
  if (event.type === 'chord-start') showChordHint(event.step);
  if (event.type === 'chord-progress') updateChordHint(event.steps);
  if (event.type === 'chord-cancel' || event.type === 'chord-timeout' || event.type === 'match') hideChordHint();
}, { signal: owner.signal });
```

Tap handlers receive detached shortcut and binding snapshots. Handler errors are swallowed, and disposal emits a final `dispose` event before observers are cleared.

## Testing

Dispatch `KeyboardEvent` instances against a mounted DOM target to test handlers and default prevention.

```ts
import { expect, it, vi } from 'vitest';

import { createKeymap } from '@vielzeug/keymap';

it('handles save', () => {
  const save = vi.fn();
  const target = document.createElement('button');
  const map = createKeymap([{ id: 'save', shortcut: 'ctrl+s', handler: save }]);
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
    const map = createKeymap([{ id: 'palette', shortcut: 'ctrl+k', handler: () => console.log('open palette') }]);
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

const map = createKeymap([{ id: 'close', shortcut: 'escape', handler: () => console.log('close palette') }]);
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

const map = createKeymap([{ id: 'close', shortcut: 'escape', handler: () => console.log('close palette') }]);

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
const reportHistoryError = (error: unknown): void => console.error(error);
const map = createKeymap([
  { id: 'undo', shortcut: 'mod+z', handler: () => void ledger.undo().catch(reportHistoryError) },
  { id: 'redo', shortcut: 'mod+shift+z', handler: () => void ledger.redo().catch(reportHistoryError) },
]);

map.mount(document);
```

### Keymap + Herald

Emit domain events instead of calling application actions from shortcut handlers.

```ts
import { createBus } from '@vielzeug/herald';
import { createKeymap } from '@vielzeug/keymap';

const bus = createBus<{ 'shortcut:save': void }>();
const map = createKeymap([
  { id: 'save', shortcut: 'ctrl+s', handler: () => bus.emit('shortcut:save') },
]);

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
- **Use** unique `id`s for each binding and mutually exclusive guards for intentional duplicate shortcuts.
