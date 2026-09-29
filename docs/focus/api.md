---
title: Focus — API Reference
description: API reference for @vielzeug/focus navigation and restoration primitives.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createListNavigation()` | Build keyboard navigation for composite widgets | Sync | Apply returned changes to DOM focus |
| `createGridNavigation()` | Build two-dimensional arrow-key navigation for grids | Sync | Columns resolve per navigation — responsive grids need a getter |
| `restoreFocus()` | Restore focus to a target or fallback | Sync | Returns `false` when neither target can receive focus |
| `rescueFocus()` | Re-home focus after the focused element unmounts | Sync | Returns `false` when focus is already on a real element |
| `captureFocus()` | Capture active focus for one later restoration | Sync | The returned function is one-shot |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/focus` | List navigation and focus restoration primitives. |

## Core Functions

### `createListNavigation()`

```ts
function createListNavigation<T>(options: ListNavigationOptions<T>): ListNavigation<T>;
```

Creates a keyboard navigation controller with an internal active index.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `ListNavigationOptions<T>` | Item lookup, key mapping, navigation, dynamic direction/orientation, and typeahead options. |

**Returns:** `ListNavigation<T>`.

**Example**

```ts
import { createListNavigation } from '@vielzeug/focus';

const nav = createListNavigation({
  getItems: () => rows,
  isItemDisabled: (item) => item.matches('[aria-disabled="true"]'),
});

const result = nav.handleKeydown(event);
result?.change?.item.focus();
```

| Member | Return | Contract |
| --- | --- | --- |
| `handleKeydown(event)` | `ListKeyResult<T> \| null` | Returns explicit handled/change state for navigation and typeahead keys. |
| `navigate(action)` | `ListNavigationChange<T> \| null` | Moves programmatically and returns the committed change. |
| `set(index)` | `number` | Sets an integer usable index, or resets to `-1`. |
| `reset()` | `void` | Clears the active index and typeahead sequence. |
| `getIndex()` | `number` | Returns the current usable index, or `-1`. |
| `getActiveItem()` | `T \| undefined` | Returns the item at the current usable index. |

Boundary navigation keys return `{ handled: true, change: null }` and remain consumed. Unrecognized, already-prevented, composing, and disabled events return `null`. Successful typeahead returns a change and follows `typeahead.preventDefault`.

Keys are matched through `matchKey` from `@vielzeug/keymap`, so `keys` overrides accept shortcut patterns with aliases (`esc`, `space`, `up`) and modifiers (`shift+Home`), and modifier state must match exactly: a plain `ArrowDown` binding does not fire on Ctrl+ArrowDown.

---

### `createGridNavigation()`

```ts
function createGridNavigation<T>(options: GridNavigationOptions<T>): GridNavigation<T>;
```

Creates a two-dimensional keyboard navigation controller: horizontal arrows step one item, vertical arrows step one row (the column count), Home/End jump to the grid's ends.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `GridNavigationOptions<T>` | Item lookup, column resolution, active-index source, key mapping, and wrapping options. |

**Returns:** `GridNavigation<T>`.

**Example**

```ts
import { createGridNavigation } from '@vielzeug/focus';

const grid = createGridNavigation<HTMLElement>({
  columns: 4,
  getActiveIndex: () => tiles().indexOf(document.activeElement as HTMLElement),
  getItems: tiles,
});

const result = grid.handleKeydown(event);
if (result?.change) result.change.item.focus();
```

| Member | Return | Contract |
| --- | --- | --- |
| `handleKeydown(event)` | `GridKeyResult<T> \| null` | Returns handled state for navigation keys; recognized keys are always consumed, even at clamped edges. |
| `navigate(action)` | `GridNavigationChange<T> \| null` | Moves programmatically and returns the committed change. |
| `set(index)` | `void` | Sets the tracked index for grids without `getActiveIndex`. |
| `reset()` | `void` | Clears the tracked index. |
| `getIndex()` | `number` | Returns the active index — derived from `getActiveIndex` when provided — or `-1`. |
| `getActiveItem()` | `T \| undefined` | Returns the item at the active index. |

Unlike `createListNavigation`, items are not skipped when disabled — skipping in two dimensions would break row alignment. With no active index, forward moves start at the first item and backward moves at the last. `columns` may be a getter resolved on every navigation, so responsive grids can read a media query and measured grids can read the rendered row length. `FocusConfigError` is thrown when `columns` resolves below `1`.

---

### `restoreFocus()`

```ts
function restoreFocus(target: FocusTarget, options?: RestoreFocusOptions): boolean;
```

Attempts to focus a connected target that is neither disabled nor inert. Throwing target getters or `focus()` implementations count as failed attempts and fall through to the configured fallback.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `FocusTarget` | Element or getter resolved when `restoreFocus()` is called. |
| `options` | `RestoreFocusOptions` | Optional lazy fallback and `preventScroll` flag. |

**Returns:** `boolean` — `true` when focus moved to the target or fallback.

**Example**

```ts
import { restoreFocus } from '@vielzeug/focus';

restoreFocus(() => triggerElement, {
  fallback: () => document.body,
  preventScroll: true,
});
```

---

### `rescueFocus()`

```ts
function rescueFocus(target: FocusTarget, options?: RestoreFocusOptions): boolean;
```

Hands focus to `target` when focus has been lost to the document body — the state left behind when the focused element unmounts mid-swap, where keydown never reaches a handler.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `FocusTarget` | Element or getter resolved when the rescue runs. |
| `options` | `RestoreFocusOptions` | Optional lazy fallback and `preventScroll` flag, as in `restoreFocus()`. |

**Returns:** `boolean` — `true` when focus was rescued; `false` when focus is already on a real element or neither target can receive focus.

**Example**

```ts
import { rescueFocus } from '@vielzeug/focus';

// After a swap that may have unmounted the focused element.
rescueFocus(() => dialog.querySelector<HTMLElement>('footer button'));
```

---

### `captureFocus()`

```ts
function captureFocus(options?: CaptureFocusOptions): FocusRestorer;
```

Captures the deepest active element immediately and returns a one-shot restoration function.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `CaptureFocusOptions` | Optional lazy fallback, `preventScroll`, and cancellation signal. |

**Returns:** `FocusRestorer`. Its first call attempts restoration; later calls return `false`.

**Example**

```ts
import { captureFocus } from '@vielzeug/focus';

const restore = captureFocus({ fallback: () => document.body });

dialog.showModal();
dialog.addEventListener('close', restore, { once: true });
```

## Types

```ts
type MaybeGetter<T> = T | (() => T);

type ListNavigationAction = 'first' | 'last' | 'next' | 'prev';
type ListKeyAction = ListNavigationAction | 'typeahead';

type ListNavigationChange<T> = {
  readonly action: ListKeyAction;
  readonly event?: KeyboardEvent;
  readonly index: number;
  readonly item: T;
};

type ListKeyResult<T> = {
  readonly change: ListNavigationChange<T> | null;
  readonly handled: true;
};

type ListNavigationTypeaheadOptions<T> = {
  delayMs?: number;
  getLabel: (item: T, index: number) => string;
  preventDefault?: boolean;
};

type ListNavigationOptions<T> = {
  direction?: MaybeGetter<'ltr' | 'rtl'>;
  disabled?: MaybeGetter<boolean>;
  getItems: () => readonly T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListNavigationAction, readonly string[]>>; // shortcut patterns matched via @vielzeug/keymap
  loop?: boolean;
  orientation?: MaybeGetter<'both' | 'horizontal' | 'vertical'>;
  typeahead?: ListNavigationTypeaheadOptions<T>;
};

type ListNavigation<T> = {
  getActiveItem(): T | undefined;
  getIndex(): number;
  handleKeydown(event: KeyboardEvent): ListKeyResult<T> | null;
  navigate(action: ListNavigationAction): ListNavigationChange<T> | null;
  reset(): void;
  set(index: number): number;
};

type GridNavigationAction = 'first' | 'last' | 'next' | 'nextRow' | 'prev' | 'prevRow';

type GridNavigationChange<T> = {
  readonly action: GridNavigationAction;
  readonly event?: KeyboardEvent;
  readonly index: number;
  readonly item: T;
};

type GridKeyResult<T> = {
  readonly change: GridNavigationChange<T> | null;
  readonly handled: true;
};

type GridColumns = number | (() => number);

type GridNavigationOptions<T> = {
  columns: GridColumns;
  direction?: MaybeGetter<'ltr' | 'rtl'>;
  disabled?: MaybeGetter<boolean>;
  getActiveIndex?: () => number;
  getItems: () => readonly T[];
  keys?: Partial<Record<GridNavigationAction, readonly string[]>>;
  loop?: boolean;
};

type GridNavigation<T> = {
  getActiveItem(): T | undefined;
  getIndex(): number;
  handleKeydown(event: KeyboardEvent): GridKeyResult<T> | null;
  navigate(action: GridNavigationAction): GridNavigationChange<T> | null;
  reset(): void;
  set(index: number): void;
};

type FocusTarget = HTMLElement | SVGElement | null | undefined | (() => HTMLElement | SVGElement | null | undefined);

type RestoreFocusOptions = {
  fallback?: FocusTarget;
  preventScroll?: boolean;
};

type CaptureFocusOptions = RestoreFocusOptions & {
  signal?: AbortSignal;
};

type FocusRestorer = () => boolean;
```

`typeahead.delayMs` defaults to `500`; supplied values must be positive and finite. `preventDefault` defaults to `false`, which preserves editable combobox input. Set it to `true` for menu-style typeahead.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `FocusError` | Base class for every focus-originated error | `instanceof FocusError` catches any focus error |
| `FocusConfigError` | Invalid navigation configuration | Extends `FocusError`. Thrown for a key assigned to two actions, a non-positive `typeahead.delayMs`, or grid `columns` resolving below `1` |
