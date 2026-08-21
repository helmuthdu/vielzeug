---
title: Focus — API Reference
description: API reference for @vielzeug/focus navigation and restoration primitives.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createListNavigation()` | Build keyboard navigation for composite widgets | Sync | Disabled items require an explicit predicate |
| `restoreFocus()` | Restore focus to a target or fallback | Sync | Returns `false` when neither target can receive focus |
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
| `options` | `ListNavigationOptions<T>` | Item lookup, key mapping, navigation, typeahead, and lifecycle options. |

**Returns:** `ListNavigation<T>`.

**Example**

```ts
import { createListNavigation } from '@vielzeug/focus';

const nav = createListNavigation({
  getItems: () => rows,
  isItemDisabled: (item) => item.matches('[aria-disabled="true"]'),
  onNavigate: ({ item }) => item.focus(),
});
```

| Member | Return | Contract |
| --- | --- | --- |
| `handleKeydown(event)` | `boolean` | Handles configured navigation keys and optional typeahead. |
| `navigate(action)` | `number` | Moves programmatically and returns the active index, or `-1`. |
| `set(index)` | `number` | Sets the active index when usable, or resets it to `-1`. |
| `reset()` | `void` | Clears the active index and typeahead sequence. |
| `getIndex()` | `number` | Returns the current usable index, or `-1`. |
| `getActiveItem()` | `T \| undefined` | Returns the item at the current usable index. |
| `dispose()` | `void` | Permanently disables the controller and aborts `disposalSignal`. |
| `disposed` | `boolean` | Indicates whether the controller is permanently disabled. |
| `disposalSignal` | `AbortSignal` | Aborts when the controller is disposed. |
| `[Symbol.dispose]()` | `void` | Calls `dispose()`. |

---

### `restoreFocus()`

```ts
function restoreFocus(target: FocusTarget, options?: RestoreFocusOptions): boolean;
```

Attempts to focus a connected target that is neither disabled nor inert.

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
  action: ListKeyAction;
  event?: KeyboardEvent;
  index: number;
  item: T;
};

type ListNavigationTypeaheadOptions<T> = {
  delayMs?: number;
  getLabel: (item: T, index: number) => string;
};

type ListNavigationOptions<T> = {
  direction?: MaybeGetter<'ltr' | 'rtl'>;
  disabled?: MaybeGetter<boolean | undefined>;
  getItems: () => readonly T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListNavigationAction, readonly string[]>>;
  loop?: boolean;
  onNavigate?: (change: ListNavigationChange<T>) => void;
  orientation?: MaybeGetter<'both' | 'horizontal' | 'vertical'>;
  signal?: AbortSignal;
  typeahead?: ListNavigationTypeaheadOptions<T>;
};

type ListNavigation<T> = {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  dispose(): void;
  getActiveItem(): T | undefined;
  getIndex(): number;
  handleKeydown(event: KeyboardEvent): boolean;
  navigate(action: ListNavigationAction): number;
  reset(): void;
  set(index: number): number;
  [Symbol.dispose](): void;
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

`typeahead.delayMs` defaults to `500`. Non-finite or non-positive values use the default.

## Errors

`@vielzeug/focus` does not export custom error classes.
