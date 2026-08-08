---
title: Keymap 2.0 Migration
description: Migrate Keymap 1.x layers, priorities, guards, parser handling, and lifecycle ownership to Keymap 2.
---

[[toc]]

# Keymap 2.0 Migration

## Keymap 2 Changes

Keymap 2 removes layers and inert binding priority. It makes `dispose()` terminal, passes each guard its `KeyboardEvent`, keeps chords local to mounted targets, and reference-counts repeated mounts.

Removed APIs:

- `createKeymapLayer()`
- `KeymapLayer`
- `BindingOptions.priority`
- `BindingEntry.priority`

## Replace `createKeymapLayer()`

Create independent maps with mutually exclusive `when(event)` guards. Keymap 2 has no implicit parent or layer precedence.

```ts
// Keymap 1
import { createKeymap, createKeymapLayer } from '@vielzeug/keymap';

const base = createKeymap({ escape: closeSidebar });
const modal = createKeymapLayer(base, { escape: closeModal });

base.mount(document);
modal.mount(document);
```

```ts
// Keymap 2
import { createKeymap } from '@vielzeug/keymap';

const base = createKeymap(
  { escape: closeSidebar },
  { when: () => !modalIsOpen() },
);
const modal = createKeymap(
  { escape: closeModal },
  { when: () => modalIsOpen() },
);

base.mount(document);
modal.mount(document);
```

Guard conditions must be mutually exclusive when maps share target and shortcut. Otherwise both handlers run.

## Remove Binding Priority

Delete `priority` from every binding and binding-entry consumer. Keymap 1 stored priority but never used it to resolve same-map dispatch.

```ts
// Keymap 1
const map = createKeymap({
  'ctrl+s': { handler: saveDocument, priority: 10 },
});

const [{ priority }] = map.listBindings();
```

```ts
// Keymap 2
const map = createKeymap({
  'ctrl+s': saveDocument,
});

const [{ trigger }] = map.listBindings();
```

Use mutually exclusive maps when UI state needs different actions for one shortcut.

## Pass Events to Guards

Zero-argument guards still run. Update custom guard types when guard logic needs event context.

```ts
// Keymap 1
const whenPanelOpen: () => boolean = () => panelIsOpen();

const map = createKeymap({
  escape: { handler: closePanel, when: whenPanelOpen },
});
```

```ts
// Keymap 2
const whenPanelOpen = (event: KeyboardEvent): boolean =>
  panelIsOpen() && event.target !== document.body;

const map = createKeymap({
  escape: { handler: closePanel, when: whenPanelOpen },
});
```

Use `event.composedPath()` to exclude native text fields from global undo and redo shortcuts.

## Treat `dispose()` as Terminal

Use mount callbacks for temporary detachment. Do not remount, bind, or unbind after disposal.

```ts
// Keymap 1
const map = createKeymap({ 'ctrl+s': saveDocument });

map.mount(document);
map.dispose();
map.mount(document);
```

```ts
// Keymap 2
const map = createKeymap({ 'ctrl+s': saveDocument });
const unmount = map.mount(document);

unmount();
// Mount this active map again later if needed.
map.mount(document);

// Dispose only when the owner ends.
map.dispose();
```

After `dispose()`, `bind()`, `unbind()`, and `mount()` throw `KeymapError`.

## Handle `parseStep()` Results

`parseStep()` now returns `null` for ambiguous input. Use `parseShortcut()` when invalid input must throw.

```ts
// Keymap 1
try {
  const step = parseStep('ctrl+k+j');
  useStep(step);
} catch (error) {
  showValidationError(error);
}
```

```ts
// Keymap 2
const step = parseStep('ctrl+k+j');

if (step === null) showValidationError('Enter one non-modifier key per step.');
else useStep(step);
```

## Update Mount Assumptions

Repeated mounts of one target no longer add duplicate listeners. Each mount call acquires one reference and each returned callback releases one reference.

```ts
// Keymap 1
const first = map.mount(document);
const second = map.mount(document);
// Matching shortcut invoked twice.
```

```ts
// Keymap 2
const first = map.mount(document);
const second = map.mount(document);
// Matching shortcut invokes once.

first();
second();
```

A chord started on one mounted target cannot finish on another. Nested targets process each bubbled event through the innermost mounted target.

## Upgrade Checklist

- Replace every layer with independent guarded maps.
- Remove priority binding properties and entry reads.
- Update guard type annotations that require `KeyboardEvent`.
- Replace disposal-as-reset flows with mount callbacks.
- Handle `null` from `parseStep()`.
- Verify nested-target and repeated-mount behavior.
- Update `@vielzeug/keymap` to version 2.
