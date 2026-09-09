---
title: Keymap — Migration Guide
description: Migrate to Keymap 3 ordered bindings, per-binding event control, parser subpath, chord tracing, and stable lifecycle ownership.
---

[[toc]]

## Keymap 3.0

Keymap 3 replaces record bindings with an ordered binding array. Each binding has an explicit ID and owns its event-control policy. Parser utilities move to `@vielzeug/keymap/parse`, and chord activity is observed through `tap()`.

Removed or changed contracts:

- `createKeymap(initialBindings: Record<string, BindingValue>)` now takes `readonly Binding[]`.
- `bind(shortcut, value)` now takes one `Binding` object.
- `unbind(shortcut)` now takes a binding ID.
- `BindingValue` and `BindingOptions` are replaced by `Binding`.
- Global `preventDefault` and `stopPropagation` options move to each binding.
- `onChordState` and `ChordStateChange` are replaced by `tap()` and `KeymapEvent`.
- Parser utilities and parser types move from the root to `@vielzeug/keymap/parse`.

### Replace record bindings with an ordered array

Pass an ordered array of binding objects. IDs identify behavior independently from the current shortcut.

```ts
// Keymap 2
const map = createKeymap({
  'ctrl+s': save,
  escape: { handler: closePanel, when: (event) => event.target === panel },
});

// Keymap 3
const map = createKeymap([
  { id: 'save', shortcut: 'ctrl+s', handler: save },
  { id: 'close', shortcut: 'escape', handler: closePanel, when: (event) => event.target === panel },
]);
```

Bindings with different IDs may share a shortcut. The first binding whose guard passes wins. Use `findShortcutConflicts()` when duplicate or prefix-shadowed shortcuts are not intentional.

### Update `bind()` and `unbind()`

`bind()` takes a binding object and returns a removal callback scoped to that registration. Replacing the same ID makes older removal callbacks harmless.

```ts
// Keymap 2
const removePalette = map.bind('ctrl+k', openPalette);
map.unbind('ctrl+k');

// Keymap 3
const removePalette = map.bind({ id: 'palette', shortcut: 'ctrl+k', handler: openPalette });
map.unbind('palette');
```

### Move event control to each binding

Set `preventDefault` and `stopPropagation` on the binding that owns the policy. Defaults remain `true` and `false`. Event control applies to matched intermediate chord steps as well as completed shortcuts.

```ts
// Keymap 2
const map = createKeymap({ 'ctrl+k': openPalette }, {
  preventDefault: false,
  stopPropagation: true,
});

// Keymap 3
const map = createKeymap([
  {
    id: 'palette',
    shortcut: 'ctrl+k',
    handler: openPalette,
    preventDefault: false,
    stopPropagation: true,
  },
]);
```

### Move parser imports to the subpath

```ts
// Keymap 2
import { canonicalizeShortcut, detectModKey, matchStep, parseShortcut, parseStep } from '@vielzeug/keymap';

// Keymap 3
import { canonicalizeShortcut, detectModKey, matchStep, parseShortcut, parseStep } from '@vielzeug/keymap/parse';
```

`formatShortcut()` and `findShortcutConflicts()` remain on the root entry point.

### Replace `onChordState` with `tap()`

`tap()` observes chord progress, cancellation, timeout, completed matches, and disposal without affecting shortcut behavior.

```ts
// Keymap 2
const map = createKeymap(
  { 'g g': goToTop },
  {
    onChordState(change) {
      if (change.type === 'started') showChordHint(change.step);
      if (change.type === 'timeout') hideChordHint();
    },
  },
);

// Keymap 3
const map = createKeymap([{ id: 'top', shortcut: 'g g', handler: goToTop }]);
const stopTrace = map.tap((event) => {
  if (event.type === 'chord-start') showChordHint(event.step);
  if (event.type === 'chord-cancel' || event.type === 'chord-timeout' || event.type === 'match') hideChordHint();
});
```

Tap handlers are isolated from key handling. Pass `{ signal }` or call the returned function to detach one.

### Update guard expectations

Global guards are evaluated before chord tracking. A failed global guard resets pending state, so a chord cannot start in a disabled context and finish after the context becomes active.

Per-binding guards participate in candidate selection. When bindings share a shortcut, Keymap invokes the first binding whose guard passes.

### Upgrade checklist

- Replace binding records with ordered `Binding[]` values.
- Add stable IDs to every binding.
- Update `bind()` and `unbind()` calls to use binding objects and IDs.
- Move event-control options onto individual bindings.
- Move parser imports to `@vielzeug/keymap/parse`.
- Replace `onChordState` with `tap()`.
- Review duplicate shortcuts and prefix conflicts.
- Update `@vielzeug/keymap` to version 3.

## Keymap 2.0

Keymap 2 removed layers and inert binding priority. It made `dispose()` terminal, passed each guard its `KeyboardEvent`, kept chords local to mounted targets, and reference-counted repeated mounts.

Removed APIs:

- `createKeymapLayer()`
- `KeymapLayer`
- `BindingOptions.priority`
- `BindingEntry.priority`

### Replace `createKeymapLayer()`

Create independent maps with mutually exclusive `when(event)` guards. Keymap 2 has no implicit parent or layer precedence.

```ts
// Keymap 1
const base = createKeymap({ escape: closeSidebar });
const modal = createKeymapLayer(base, { escape: closeModal });

// Keymap 2
const base = createKeymap({ escape: closeSidebar }, { when: () => !modalIsOpen() });
const modal = createKeymap({ escape: closeModal }, { when: () => modalIsOpen() });
```

Guard conditions must be mutually exclusive when maps share a target and shortcut. Otherwise both handlers run.

### Remove binding priority

Delete `priority` from binding configuration and `BindingEntry` consumers. Keymap 1 stored priority but never used it to resolve dispatch.

```ts
// Keymap 1
const map = createKeymap({
  'ctrl+s': { handler: saveDocument, priority: 10 },
});

// Keymap 2
const map = createKeymap({
  'ctrl+s': saveDocument,
});
```

### Pass events to guards

Zero-argument guards continue to run. Update guard annotations when logic needs keyboard-event context.

```ts
const whenPanelOpen = (event: KeyboardEvent): boolean =>
  panelIsOpen() && event.target !== document.body;

const map = createKeymap({
  escape: { handler: closePanel, when: whenPanelOpen },
});
```

### Treat `dispose()` as terminal

Use mount callbacks for temporary detachment. After disposal, `bind()`, `unbind()`, and `mount()` throw `KeymapError`.

```ts
const map = createKeymap({ 'ctrl+s': saveDocument });
const unmount = map.mount(document);

unmount();
map.mount(document);
map.dispose();
```

### Handle `parseStep()` results

`parseStep()` returns `null` for invalid or ambiguous input. Use `parseShortcut()` when invalid input must throw.

```ts
const step = parseStep('ctrl+k+j');

if (step === null) showValidationError('Enter one non-modifier key per step.');
else useStep(step);
```

### Update mount assumptions

Repeated mounts of one target share one listener. Each mount acquires one reference, and each returned callback releases one reference. Chord state remains local to each mounted target; nested targets process a bubbled event through the innermost mounted target.

### Upgrade checklist

- Replace layers with independent guarded maps.
- Remove priority properties and entry reads.
- Update guard annotations that use `KeyboardEvent`.
- Replace disposal-as-reset flows with mount callbacks.
- Handle `null` from `parseStep()`.
- Verify nested-target and repeated-mount behavior.
- Update `@vielzeug/keymap` to version 2.
