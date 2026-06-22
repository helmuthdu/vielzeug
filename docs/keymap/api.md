---
title: Keymap — API Reference
description: Full API reference for @vielzeug/keymap — createKeymap, createKeymapLayer, formatShortcut, and all types.
---

# API Reference

## API Overview

| Export | Kind | Description |
| ------ | ---- | ----------- |
| `createKeymap` | function | Creates a headless keyboard shortcut manager |
| `createKeymapLayer` | function | Creates a scoped keymap layer that stacks on a parent |
| `formatShortcut` | function | Formats a shortcut string for display (Mac symbols or word labels) |
| `Keymap` | interface | Object returned by `createKeymap` |
| `KeymapLayer` | interface | Extends `Keymap` with `activate()`, `deactivate()`, `active` |
| `KeymapOptions` | interface | Options for `createKeymap` and `createKeymapLayer` |
| `BindingOptions` | type | Per-binding object: `{ handler, when?, trigger?, priority? }` |
| `BindingValue` | type | `Handler \| BindingOptions` — accepted wherever a handler is bound |
| `Handler` | type | `(event: KeyboardEvent) => void` |
| `parseShortcut` | function | Parses a shortcut string into `ShortcutStep[]` |
| `parseStep` | function | Parses a single chord step into `ShortcutStep \| null` |
| `matchStep` | function | Tests whether a `KeyboardEvent` matches a `ShortcutStep` |
| `canonicalizeShortcut` | function | Converts `ShortcutStep[]` into a stable canonical string |
| `detectModKey` | function | Detects the platform modifier key (`'ctrl'` or `'meta'`) |
| `ShortcutStep` | type | `{ key: string; modifiers: Set<ModifierKey> }` — one parsed step |
| `Shortcut` | type | `ShortcutStep[]` — the result of `parseShortcut` |
| `ModifierKey` | type | `'alt' \| 'ctrl' \| 'meta' \| 'shift'` |
| `BindingEntry` | type | Snapshot of a registered binding: `{ shortcut, trigger, priority }` |

## Package Entry Points

```ts
import {
  canonicalizeShortcut, createKeymap, createKeymapLayer,
  detectModKey, formatShortcut, matchStep, parseShortcut, parseStep,
} from '@vielzeug/keymap';
import type {
  BindingEntry, BindingOptions, BindingValue, Handler, Keymap,
  KeymapLayer, KeymapOptions, ModifierKey, Shortcut, ShortcutStep,
} from '@vielzeug/keymap';
```

## `createKeymap(bindings?, options?)`

Creates a headless keyboard shortcut manager.

```ts
function createKeymap(
  bindings?: Record<string, BindingValue>,
  options?: KeymapOptions,
): Keymap
```

**Parameters**

- `bindings` — Optional record mapping shortcut strings to `BindingValue`. Shortcut strings support chord sequences (space-separated steps), modifier aliases (`mod`, `cmd`, `ctrl`, `alt`, `shift`), special key aliases (`esc`, `space`, `up`, etc.), and are case-insensitive.
- `options` — Optional configuration (see `KeymapOptions`).

**Returns** a `Keymap` object.

**Example**

```ts
const map = createKeymap({
  'mod+k mod+s': () => save(),
  'mod+shift+p': () => openPalette(),
  'g g':         () => goToTop(),
  esc:           { handler: closePanel, when: () => isPanelOpen() },
  space:         { handler: togglePlay, trigger: 'keyup' },
}, { modKey: 'ctrl' });

const unmount = map.mount(document);
```

## `Keymap`

```ts
interface Keymap {
  bind(shortcut: string, value: BindingValue): () => void;
  dispose(): void;
  listBindings(): readonly BindingEntry[];
  mount(target: EventTarget): () => void;
  unbind(shortcut: string): void;
  [Symbol.dispose](): void;
}
```

### `mount(target)`

Attaches `keydown` and `keyup` listeners to `target`. Returns an unmount function that removes only the listeners added by this call.

```ts
const unmount = map.mount(document);
unmount(); // detach
```

One keymap can be mounted to multiple targets simultaneously. Each call returns an independent unmount function.

### `bind(shortcut, value)`

Adds or replaces a binding at runtime. Returns an unbind function.

```ts
const unbind = map.bind('ctrl+shift+f', () => openSearch());
unbind(); // remove just this binding
```

Throws if `shortcut` is invalid (modifier-only, empty, or ambiguous).

### `unbind(shortcut)`

Removes the binding for the given shortcut string. Emits a dev warning if the shortcut is not registered; never throws.

```ts
map.unbind('ctrl+k');
```

### `dispose()`

Removes all mounted listeners and resets chord state. Idempotent.

```ts
map.dispose();
// or:
using map = createKeymap({ ... });
```

### `listBindings()`

Returns a snapshot of all currently registered bindings. Does not include `handler` or `when` — only the shortcut shape, trigger, and priority.

```ts
const entries = map.listBindings();
// [
//   { shortcut: [{ key: 'k', modifiers: Set { 'ctrl' } }], trigger: 'keydown', priority: 0 },
// ]
```

Useful for building shortcut palette UIs, conflict detection, and accessibility overlays.

## `KeymapOptions`

```ts
interface KeymapOptions {
  chordTimeout?:   number;            // default: 1000ms
  modKey?:         'ctrl' | 'meta';   // default: platform-detected
  preventDefault?: boolean;           // default: true
  stopPropagation?: boolean;          // default: false
  when?:           () => boolean;
}
```

| Option | Default | Description |
| ------ | ------- | ----------- |
| `chordTimeout` | `1000` | Milliseconds before a partial chord sequence resets |
| `modKey` | platform | Override `mod` alias resolution: `'meta'` (Mac ⌘) or `'ctrl'` (Windows/Linux). Auto-detected from `navigator` when omitted. |
| `preventDefault` | `true` | Call `event.preventDefault()` on a matched binding |
| `stopPropagation` | `false` | Call `event.stopPropagation()` on a matched binding |
| `when` | — | Global guard predicate; all bindings are suppressed when `when()` returns `false` |

## `createKeymapLayer(parent, bindings?, options?)`

Creates a scoped keymap layer that stacks on top of a parent keymap. The caller is responsible for mounting both the parent and the layer independently — each manages its own event listeners.

```ts
function createKeymapLayer(
  parent: Keymap,
  bindings?: Record<string, BindingValue>,
  options?: KeymapOptions,
): KeymapLayer
```

**Example**

```ts
const base = createKeymap({ 'ctrl+z': undo });
const modal = createKeymapLayer(base, {
  esc: { handler: closeModal, when: () => isModalOpen() },
});

// Mount parent and layer independently — each manages its own listeners.
const unmountBase = base.mount(document);
const unmountModal = modal.mount(document);

modal.deactivate(); // base handles everything; layer is suspended
modal.activate();   // layer resumes

unmountModal();
unmountBase();
```

Disposing the layer does **not** dispose the parent — the caller owns the parent lifecycle.

## `KeymapLayer`

```ts
interface KeymapLayer extends Keymap {
  activate(): void;
  deactivate(): void;
  readonly active: boolean;
  readonly parent: Keymap;
}
```

| Member | Description |
| ------ | ----------- |
| `activate()` | Re-enables the layer (default: active) |
| `deactivate()` | Suspends the layer; the parent keymap continues to fire normally |
| `active` | `true` when the layer is currently active |
| `parent` | Returns the parent `Keymap` passed to `createKeymapLayer` |
| `listBindings()` | Returns the layer's own bindings (not the parent's) |

## `formatShortcut(shortcut, modKey?)`

Formats a shortcut string into a human-readable display string. Resolves `mod` using `modKey`.

```ts
function formatShortcut(
  shortcut: string,
  modKey?: 'ctrl' | 'meta',
): string
```

On Mac (`modKey: 'meta'`), uses standard Mac symbols. On other platforms, uses word labels.

```ts
formatShortcut('mod+shift+p', 'meta') // '⇧⌘P'
formatShortcut('mod+shift+p', 'ctrl') // 'Ctrl+Shift+P'
formatShortcut('ctrl+k ctrl+s', 'meta') // '⌃K ⌃S'
formatShortcut('escape', 'meta') // 'Esc'
```

## Types

### `BindingOptions`

Per-binding configuration object.

```ts
type BindingOptions = {
  handler:   Handler;
  priority?: number;              // default: 0
  trigger?:  'keydown' | 'keyup'; // default: 'keydown'
  when?:     () => boolean;
};
```

| Field | Default | Description |
| ----- | ------- | ----------- |
| `handler` | — | The function to call when the shortcut fires |
| `priority` | `0` | When multiple bindings complete at the same chord step, higher priority wins |
| `trigger` | `'keydown'` | Which keyboard event phase fires the handler |
| `when` | — | Per-binding guard; handler suppressed when `when()` returns `false` at event time |

### `BindingValue`

```ts
type BindingValue = Handler | BindingOptions;
```

A plain function is treated as `{ handler: fn, priority: 0, trigger: 'keydown' }`. Use `BindingOptions` for any per-binding customisation.

```ts
const map = createKeymap({
  'ctrl+k': () => quickAction(),
  esc:      { handler: closePanel, when: () => isPanelOpen() },
  space:    { handler: togglePlay, trigger: 'keyup', priority: 5 },
});
```

### `Handler`

```ts
type Handler = (event: KeyboardEvent) => void;
```

### `ShortcutStep`

One parsed step within a shortcut sequence.

```ts
type ShortcutStep = {
  key: string;                  // lowercase, alias-resolved key name
  modifiers: Set<ModifierKey>;  // required modifier keys
};
```

### `Shortcut`

An alias for `ShortcutStep[]` — the direct return type of `parseShortcut`.

```ts
type Shortcut = ShortcutStep[];
```

### `ModifierKey`

```ts
type ModifierKey = 'alt' | 'ctrl' | 'meta' | 'shift';
```

### `BindingEntry`

A read-only snapshot of a registered binding, returned by `listBindings()`. The `handler` and `when` guard are intentionally omitted.

```ts
type BindingEntry = {
  readonly priority: number;
  readonly shortcut: readonly ShortcutStep[];
  readonly trigger:  'keydown' | 'keyup';
};
```

| Field | Description |
| ----- | ----------- |
| `priority` | The binding's priority value |
| `shortcut` | The parsed shortcut steps |
| `trigger` | Which event phase fires the handler |

---

## Parser Utilities

### `parseShortcut(raw, modKey?)`

Parses a shortcut string into an array of `ShortcutStep` objects. Useful for building custom matchers, testing, or integrating with other libraries.

```ts
function parseShortcut(
  raw: string,
  modKey?: 'ctrl' | 'meta',  // default: auto-detected
): Shortcut
```

Throws if any non-empty step is invalid (modifier-only with no key, or ambiguous multi-key step like `ctrl+k+j`). Extra whitespace between steps is silently ignored.

```ts
parseShortcut('ctrl+k ctrl+s', 'ctrl')
// [
//   { key: 'k', modifiers: Set { 'ctrl' } },
//   { key: 's', modifiers: Set { 'ctrl' } },
// ]
```

### `parseStep(raw, modKey?)`

Parses a **single** chord step (one keypress) into a `ShortcutStep`, or returns `null` if the step is empty or invalid. Does not throw.

```ts
function parseStep(
  raw: string,
  modKey?: 'ctrl' | 'meta',
): ShortcutStep | null
```

Unlike `parseShortcut`, `parseStep` returns `null` instead of throwing on invalid input — useful for "try" patterns when parsing user-typed shortcut strings one step at a time.

```ts
parseStep('ctrl+k', 'ctrl')  // { key: 'k', modifiers: Set { 'ctrl' } }
parseStep('', 'ctrl')         // null
```

### `matchStep(event, step)`

Tests whether a `KeyboardEvent` matches a `ShortcutStep`. Zero allocations — pure boolean comparisons.

```ts
function matchStep(event: KeyboardEvent, step: ShortcutStep): boolean
```

### `canonicalizeShortcut(steps)`

Converts a `ShortcutStep[]` (i.e. the result of `parseShortcut`) into a stable canonical string. Modifiers are sorted alphabetically, steps are space-separated. Useful for conflict detection: two shortcuts resolve to the same canonical string if and only if they match the same key events.

```ts
function canonicalizeShortcut(steps: ShortcutStep[]): string
```

```ts
canonicalize(parseShortcut('cmd+k', 'ctrl'))    // 'meta+k'
canonicalize(parseShortcut('meta+k', 'ctrl'))   // 'meta+k'
canonicalize(parseShortcut('ctrl+k ctrl+s', 'ctrl')) // 'ctrl+k ctrl+s'
```

### `detectModKey()`

Detects the platform modifier key. Returns `'meta'` on macOS, `'ctrl'` elsewhere.

```ts
function detectModKey(): 'ctrl' | 'meta'
```

Useful when you need a consistent `modKey` across multiple calls to `createKeymap`, `formatShortcut`, and `parseShortcut` without threading it manually.

```ts
const modKey = detectModKey();
const map = createKeymap(bindings, { modKey });
const label = formatShortcut('mod+k', modKey);
```

---

## Shortcut String Syntax

Shortcut strings are space-separated steps. Each step is `+`-joined modifier names and a single non-modifier key.

### Modifier aliases

| You write | Resolves to |
| --------- | ----------- |
| `mod` | `meta` on Mac, `ctrl` elsewhere (per `modKey`) |
| `cmd`, `command`, `win` | `meta` |
| `opt`, `option` | `alt` |
| `control` | `ctrl` |

### Special key aliases

| You write | `KeyboardEvent.key` |
| --------- | ------------------- |
| `esc` | `Escape` |
| `space`, `spacebar` | ` ` (space character) |
| `del` | `Delete` |
| `up` | `ArrowUp` |
| `down` | `ArrowDown` |
| `left` | `ArrowLeft` |
| `right` | `ArrowRight` |

### Examples

```
'ctrl+k'           → single step, Ctrl modifier
'ctrl+k ctrl+s'    → two-step chord (VS Code–style)
'g g'              → two-step key-key chord (Vim-style)
'mod+shift+p'      → ⌘⇧P on Mac, Ctrl+Shift+P elsewhere
'escape'           → Escape key, no modifiers
'space'            → Space key (alias for ' ')
```
