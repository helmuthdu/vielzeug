---
title: Keymap — API Reference
description: Complete API reference for @vielzeug/keymap bindings, chords, parsing, formatting, and lifecycle.
---

[[toc]]

## API Overview

### Core API (Most Users)

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createKeymap()` | Create shortcut manager from an ordered binding array | Sync | `dispose()` is terminal |
| `findShortcutConflicts()` | Find duplicate and prefix paths | Sync | Invalid non-empty input throws |
| `formatShortcut()` | Format shortcut labels | Sync | Invalid input returns `''` |
| `tap()` | Observe chord lifecycle, matches, and disposal | Sync | Observer failures are swallowed |
| `Binding` | Per-binding config type (id, shortcut, handler, trigger, when, preventDefault, stopPropagation) | — | Reusing an `id` replaces its binding |

### Parser Subpath (`@vielzeug/keymap/parse`)

Use the parser subpath if you're building keyboard-aware config validators, custom UI, or framework integrations.

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `parseShortcut()` | Strictly parse full shortcut | Sync | Empty input throws |
| `parseStep()` | Parse one step without throwing | Sync | Invalid input returns `null` |
| `canonicalizeShortcut()` | Create stable shortcut key | Sync | Input must already be parsed |
| `matchStep()` | Test event against parsed step | Sync | Extra modifiers prevent a match |
| `detectModKey()` | Resolve platform primary modifier | Sync | Returns `ctrl` without `navigator` |

### Errors

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `KeymapError` | Base Keymap error | Sync | Includes parse and lifecycle errors |
| `KeymapParseError` | Strict parser error | Sync | `parseStep()` never throws it |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/keymap` | Root entry point for `createKeymap`, `formatShortcut`, `findShortcutConflicts`, errors, and public types. |
| `@vielzeug/keymap/parse` | Parser internals subpath for custom tooling: `parseShortcut`, `parseStep`, `matchStep`, `canonicalizeShortcut`, `detectModKey`. |

## Core Manager

### `createKeymap()`

```ts
function createKeymap(
  bindings?: readonly Binding[],
  options?: KeymapOptions,
): Keymap;
```

Creates shortcut manager with independent chord state for each mounted target.

| Parameter | Type | Description |
| --- | --- | --- |
| `bindings` | `readonly Binding[]` | Ordered array of bindings. Each binding has an explicit `id`, `shortcut`, and `handler`. |
| `options` | `KeymapOptions` | Chord, modifier, and global-guard configuration. |

**Returns:** `Keymap`.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap([
  { id: 'save', shortcut: 'ctrl+s', handler: () => console.log('save') },
]);
const unmount = map.mount(document);

unmount();
map.dispose();
```

| `Keymap` member | Return | Contract |
| --- | --- | --- |
| `bind(binding)` | `() => void` | Adds or replaces a binding with the same `id`. Returned callback removes that binding while active. |
| `mount(target)` | `() => void` | Adds target listener. Repeat mounts of same target are reference-counted. |
| `unbind(id)` | `void` | Removes binding by id. Warns in development when unknown. |
| `listBindings()` | `readonly BindingEntry[]` | Returns a detached binding snapshot. |
| `tap(handler, options?)` | `() => void` | Observes chord lifecycle, matches, and disposal. Supports signal-owned teardown. |
| `dispose()` | `void` | Removes all listeners, aborts signal, and permanently disposes map. Idempotent. |
| `disposed` | `boolean` | `true` after first `dispose()`. |
| `disposalSignal` | `AbortSignal` | Aborts when map is disposed. |
| `[Symbol.dispose]()` | `void` | Calls `dispose()`. |

After disposal, `bind()`, `unbind()`, and `mount()` throw `KeymapError`.

## Runtime Observation

### `tap()`

```ts
function tap(
  handler: (event: KeymapEvent) => void,
  options?: { signal?: AbortSignal },
): () => void;
```

Observes chord progress, cancellation, completed matches, timeouts, and disposal without affecting shortcut behavior.

| Parameter | Type | Description |
| --- | --- | --- |
| `handler` | `(event: KeymapEvent) => void` | Receives each runtime event synchronously. Errors are swallowed. |
| `options.signal` | `AbortSignal` | Detaches the handler when aborted. |

**Returns:** An idempotent detach function.

```ts
const stop = map.tap((event) => {
  if (event.type === 'chord-start') showChordHint(event.step);
  if (event.type === 'chord-cancel' || event.type === 'chord-timeout' || event.type === 'match') hideChordHint();
});
```

## Conflict Analysis

### `findShortcutConflicts()`

```ts
function findShortcutConflicts(
  shortcut: string,
  entries: readonly BindingEntry[],
  options?: ConflictOptions,
): BindingEntry[];
```

Returns entries with same-trigger exact or prefix-conflicting shortcut paths.

| Parameter | Type | Description |
| --- | --- | --- |
| `shortcut` | `string` | Proposed shortcut. Empty or whitespace-only input returns no conflicts. |
| `entries` | `readonly BindingEntry[]` | Bindings to compare, commonly `map.listBindings()`. |
| `options` | `ConflictOptions` | Optional modifier resolution and trigger filter. |

**Returns:** Matching entries. Returns `[]` when no conflict exists.

```ts
import { createKeymap, findShortcutConflicts } from '@vielzeug/keymap';

const map = createKeymap([{ id: 'top', shortcut: 'g', handler: () => console.log('top') }]);
const conflicts = findShortcutConflicts('g g', map.listBindings());

console.log(conflicts.length); // 1
```

## Formatting

### `formatShortcut()`

```ts
function formatShortcut(shortcut: string, modKey?: 'ctrl' | 'meta'): string;
```

Formats parsed shortcut into Mac symbols for `meta` or word labels for `ctrl`.

| Parameter | Type | Description |
| --- | --- | --- |
| `shortcut` | `string` | Shortcut string to format. |
| `modKey` | `'ctrl' \| 'meta'` | Platform primary modifier. Defaults to `detectModKey()`. |

**Returns:** Display label, or `''` for invalid input.

```ts
import { formatShortcut } from '@vielzeug/keymap';

formatShortcut('mod+shift+p', 'meta'); // ⇧⌘P
formatShortcut('mod+shift+p', 'ctrl'); // Ctrl+Shift+P
```

## Parser Subpath (`@vielzeug/keymap/parse`)

### `parseShortcut()`

```ts
function parseShortcut(raw: string, modKey?: 'ctrl' | 'meta'): Shortcut;
```

Strictly parses one or more space-separated shortcut steps.

| Parameter | Type | Description |
| --- | --- | --- |
| `raw` | `string` | Full shortcut string. |
| `modKey` | `'ctrl' \| 'meta'` | Platform primary modifier. Defaults to `detectModKey()`. |

**Returns:** Parsed `Shortcut`.

```ts
import { parseShortcut } from '@vielzeug/keymap/parse';

const shortcut = parseShortcut('ctrl+k ctrl+s', 'ctrl');
console.log(shortcut.length); // 2
```

Throws `KeymapParseError` for empty, modifier-only, or ambiguous steps.

---

### `parseStep()`

```ts
function parseStep(raw: string, modKey?: 'ctrl' | 'meta'): ShortcutStep | null;
```

Parses one shortcut step without throwing.

| Parameter | Type | Description |
| --- | --- | --- |
| `raw` | `string` | One shortcut step. |
| `modKey` | `'ctrl' \| 'meta'` | Platform primary modifier. Defaults to `detectModKey()`. |

**Returns:** Parsed `ShortcutStep`, or `null` for empty, modifier-only, or ambiguous input.

```ts
import { parseStep } from '@vielzeug/keymap/parse';

parseStep('ctrl+k', 'ctrl'); // { key: 'k', modifiers: Set(['ctrl']) }
parseStep('ctrl+k+j', 'ctrl'); // null
```

---

### `canonicalizeShortcut()`

```ts
function canonicalizeShortcut(steps: readonly ShortcutStep[]): string;
```

Converts parsed steps into stable canonical string with sorted modifier order.

| Parameter | Type | Description |
| --- | --- | --- |
| `steps` | `readonly ShortcutStep[]` | Parsed shortcut steps. |

**Returns:** Canonical shortcut string.

```ts
import { canonicalizeShortcut, parseShortcut } from '@vielzeug/keymap/parse';

canonicalizeShortcut(parseShortcut('shift+ctrl+k', 'ctrl')); // ctrl+shift+k
```

---

### `matchStep()`

```ts
function matchStep(event: KeyboardEvent, step: ShortcutStep): boolean;
```

Tests exact key and modifier equality for one parsed step.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | `KeyboardEvent` | Event to match. Missing runtime `key` returns `false`. |
| `step` | `ShortcutStep` | Parsed step. |

**Returns:** `true` only when key and all modifier states match.

```ts
import { matchStep, parseStep } from '@vielzeug/keymap/parse';

const step = parseStep('ctrl+k', 'ctrl')!;
matchStep(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }), step); // true
```

---

### `detectModKey()`

```ts
function detectModKey(): 'ctrl' | 'meta';
```

Detects Mac platform from `navigator` and otherwise returns `ctrl`.

**Returns:** `'meta'` on Mac platforms; `'ctrl'` elsewhere or without `navigator`.

```ts
import { detectModKey } from '@vielzeug/keymap/parse';

const modKey = detectModKey();
```

## Types

### `Keymap`

Stateful shortcut manager returned by `createKeymap()`.

```ts
interface Keymap {
  [Symbol.dispose](): void;
  bind(binding: Binding): () => void;
  dispose(): void;
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  listBindings(): readonly BindingEntry[];
  mount(target: EventTarget): () => void;
  tap(handler: (event: KeymapEvent) => void, options?: { signal?: AbortSignal }): () => void;
  unbind(id: string): void;
}
```

### `KeymapOptions`

Options applied to every binding owned by one manager.

```ts
interface KeymapOptions {
  chordTimeout?: number;
  modKey?: 'ctrl' | 'meta';
  when?: When;
}
```

- `when`: Guard function called for all bindings. When combined with per-binding `when` guards, both must return `true` for the handler to fire (AND composition). Global guard is checked first.

### `KeymapEvent`

Runtime event observed through `tap()`.

```ts
type KeymapEvent =
  | { type: 'chord-cancel'; target: EventTarget; trigger: 'keydown' | 'keyup' }
  | { type: 'chord-start'; step: ShortcutStep; target: EventTarget; trigger: 'keydown' | 'keyup' }
  | { type: 'chord-progress'; steps: readonly ShortcutStep[]; target: EventTarget; trigger: 'keydown' | 'keyup' }
  | { type: 'chord-timeout'; target: EventTarget; trigger: 'keydown' | 'keyup' }
  | { type: 'match'; binding: BindingEntry; target: EventTarget; trigger: 'keydown' | 'keyup' }
  | { type: 'dispose' };
```

`step`, `steps`, and `binding` are detached snapshots. Mutating them does not affect matching.

### `Binding`

Per-binding configuration. Each binding has an explicit `id` so duplicate shortcuts can coexist. Reusing an ID replaces its binding; among duplicate shortcuts, the first binding whose guard passes wins.

```ts
interface Binding {
  id: string;
  shortcut: string;
  handler: Handler;
  trigger?: 'keydown' | 'keyup';
  when?: When;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}
```

- `trigger`: Defaults to `'keydown'`.
- `preventDefault`: Defaults to `true`. Set to `false` for shortcuts that must retain browser behavior.
- `stopPropagation`: Defaults to `false`.

### `Handler` and `When`

```ts
type Handler = (event: KeyboardEvent) => void;
type When = (event: KeyboardEvent) => boolean;
```

### `BindingEntry`

Detached binding metadata returned by `listBindings()`.

```ts
type BindingEntry = {
  readonly id: string;
  readonly shortcut: readonly ShortcutStep[];
  readonly trigger: 'keydown' | 'keyup';
  readonly preventDefault: boolean;
  readonly stopPropagation: boolean;
};
```

### `ModifierKey`, `Shortcut`, and `ShortcutStep`

Parser types used by `parseShortcut()`, `parseStep()`, `matchStep()`, and `canonicalizeShortcut()`. Available from `@vielzeug/keymap/parse`.

```ts
type ModifierKey = 'alt' | 'ctrl' | 'meta' | 'shift';

type ShortcutStep = {
  key: string;
  modifiers: Set<ModifierKey>;
};

type Shortcut = ShortcutStep[];
```

### `ConflictOptions`

Comparison options for `findShortcutConflicts()`.

```ts
interface ConflictOptions {
  modKey?: 'ctrl' | 'meta';
  trigger?: 'keydown' | 'keyup';
}
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `KeymapError` | Lifecycle operation after disposal | Use `instanceof KeymapError` to narrow Keymap errors. |
| `KeymapParseError` | Strict shortcut parser receives invalid input | Extends `KeymapError`. |
