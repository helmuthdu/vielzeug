---
title: Keymap — API Reference
description: Complete API reference for @vielzeug/keymap bindings, chords, parsing, formatting, and lifecycle.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createKeymap()` | Create shortcut manager | Sync | `dispose()` is terminal |
| `findShortcutConflicts()` | Find duplicate and prefix paths | Sync | Invalid non-empty input throws |
| `formatShortcut()` | Format shortcut labels | Sync | Invalid input returns `''` |
| `parseShortcut()` | Strictly parse full shortcut | Sync | Empty input throws |
| `parseStep()` | Parse one step without throwing | Sync | Invalid input returns `null` |
| `canonicalizeShortcut()` | Create stable shortcut key | Sync | Input must already be parsed |
| `matchStep()` | Test event against parsed step | Sync | Extra modifiers prevent a match |
| `detectModKey()` | Resolve platform primary modifier | Sync | Returns `ctrl` without `navigator` |
| `KeymapError` | Base Keymap error | Sync | Includes parse and lifecycle errors |
| `KeymapParseError` | Strict parser error | Sync | `parseStep()` never throws it |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/keymap` | Root entry point for every runtime function, error class, and public type listed here. |

## Core Manager

### `createKeymap()`

```ts
function createKeymap(
  bindings?: Record<string, BindingValue>,
  options?: KeymapOptions,
): Keymap;
```

Creates shortcut manager with independent chord state for each mounted target.

| Parameter | Type | Description |
| --- | --- | --- |
| `bindings` | `Record<string, BindingValue>` | Initial bindings. Keys must be non-empty valid shortcut strings. |
| `options` | `KeymapOptions` | Chord, modifier, event, and global-guard configuration. |

**Returns:** `Keymap`.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({ 'ctrl+s': () => console.log('save') });
const unmount = map.mount(document);

unmount();
map.dispose();
```

| `Keymap` member | Return | Contract |
| --- | --- | --- |
| `bind(shortcut, value)` | `() => void` | Adds or replaces canonical shortcut. Returned callback removes that binding while active. |
| `mount(target)` | `() => void` | Adds target listener. Repeat mounts of same target are reference-counted. |
| `unbind(shortcut)` | `void` | Removes canonical shortcut. Warns in development when unknown. |
| `listBindings()` | `readonly BindingEntry[]` | Returns a detached binding snapshot. |
| `dispose()` | `void` | Removes all listeners, aborts signal, and permanently disposes map. Idempotent. |
| `disposed` | `boolean` | `true` after first `dispose()`. |
| `disposalSignal` | `AbortSignal` | Aborts when map is disposed. |
| `[Symbol.dispose]()` | `void` | Calls `dispose()`. |

After disposal, `bind()`, `unbind()`, and `mount()` throw `KeymapError`.

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

const map = createKeymap({ g: () => console.log('top') });
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

## Parsing and Matching

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
import { parseShortcut } from '@vielzeug/keymap';

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
import { parseStep } from '@vielzeug/keymap';

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
import { canonicalizeShortcut, parseShortcut } from '@vielzeug/keymap';

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
import { matchStep, parseStep } from '@vielzeug/keymap';

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
import { detectModKey } from '@vielzeug/keymap';

const modKey = detectModKey();
```

## Types

### `Keymap`

Stateful shortcut manager returned by `createKeymap()`.

```ts
interface Keymap {
  [Symbol.dispose](): void;
  bind(shortcut: string, value: BindingValue): () => void;
  dispose(): void;
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  listBindings(): readonly BindingEntry[];
  mount(target: EventTarget): () => void;
  unbind(shortcut: string): void;
}
```

### `KeymapOptions`

Options applied to every binding owned by one manager.

```ts
interface KeymapOptions {
  chordTimeout?: number;
  modKey?: 'ctrl' | 'meta';
  preventDefault?: boolean;
  stopPropagation?: boolean;
  when?: When;
}
```

### `BindingOptions`

Per-binding handler configuration.

```ts
type BindingOptions = {
  handler: Handler;
  trigger?: 'keydown' | 'keyup';
  when?: When;
};
```

### `BindingValue`, `Handler`, and `When`

Accepted values when registering a shortcut.

```ts
type Handler = (event: KeyboardEvent) => void;
type When = (event: KeyboardEvent) => boolean;
type BindingValue = Handler | BindingOptions;
```

### `BindingEntry`

Detached binding metadata returned by `listBindings()`.

```ts
type BindingEntry = {
  readonly shortcut: readonly ShortcutStep[];
  readonly trigger: 'keydown' | 'keyup';
};
```

### `ConflictOptions`

Comparison options for `findShortcutConflicts()`.

```ts
interface ConflictOptions {
  modKey?: 'ctrl' | 'meta';
  trigger?: 'keydown' | 'keyup';
}
```

### Shortcut Parser Types

Parsed shortcut data.

```ts
type ModifierKey = 'alt' | 'ctrl' | 'meta' | 'shift';

type ShortcutStep = {
  key: string;
  modifiers: Set<ModifierKey>;
};

type Shortcut = ShortcutStep[];
```

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `KeymapError` | Lifecycle operation after disposal | `KeymapError.is(error)` narrows Keymap errors. |
| `KeymapParseError` | Strict shortcut parser receives invalid input | Extends `KeymapError`. |
