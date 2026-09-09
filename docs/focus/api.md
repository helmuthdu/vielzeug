---
title: Focus — API Reference
description: API reference for @vielzeug/focus navigation and restoration primitives.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createListNavigation()` | Build keyboard navigation for composite widgets | Sync | Apply returned changes to DOM focus |
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
  keys?: Partial<Record<ListNavigationAction, readonly string[]>>;
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

`@vielzeug/focus` does not export custom error classes.
