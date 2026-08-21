---
title: Focus — API Reference
description: API reference for @vielzeug/focus navigation and restoration primitives.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createListNavigation()` | Build keyboard navigation for composite widgets | Sync | Requires item lookup callback |
| `restoreFocus()` | Restore focus to a target or fallback | Sync | Returns `false` for disconnected targets |
| `captureFocus()` | Capture active focus for later restoration | Sync | Dispose when no longer needed |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/focus` | List navigation and focus restoration primitives. |

## Core Functions

### `createListNavigation()`

```ts
function createListNavigation<T>(options: ListNavigationOptions<T>): ListNavigation<T>;
```

Creates a reusable keyboard navigation controller.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `ListNavigationOptions<T>` | Items, key bindings, callbacks, and lifecycle options. |

**Returns:** `ListNavigation<T>`.

```ts
import { createListNavigation } from '@vielzeug/focus';

const nav = createListNavigation({
  getItems: () => rows,
  onNavigate: (_action, index) => rows[index]?.focus(),
});
```

| Member | Return | Contract |
| --- | --- | --- |
| `handleKeydown(event)` | `boolean` | Handles configured navigation keys and typeahead. |
| `navigate(action)` | `number` | Programmatic next/prev/first/last navigation. |
| `set(index)` | `number` | Programmatically sets current index when allowed. |
| `reset()` | `void` | Clears current index to `-1`. |
| `getIndex()` | `number` | Current navigation index. |
| `getActiveItem()` | `T \| undefined` | Item at current index. |
| `dispose()` | `void` | Aborts `disposalSignal` and clears typeahead timer. Idempotent. |
| `disposed` | `boolean` | `true` after first `dispose()`. |
| `disposalSignal` | `AbortSignal` | Aborts when the navigation handle is disposed. |
| `[Symbol.dispose]()` | `void` | Calls `dispose()`. |

### `restoreFocus()`

```ts
function restoreFocus(target: FocusTarget, options?: RestoreFocusOptions): boolean;
```

Attempts to focus `target` when it is connected, not disabled, and not inert. Falls back to `options.fallback` when the primary target cannot receive focus.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `FocusTarget` | Element or getter returning the element to focus. |
| `options` | `RestoreFocusOptions` | Optional fallback target and `preventScroll` flag. |

**Returns:** `boolean` — `true` when focus moved to the target or fallback.

```ts
import { restoreFocus } from '@vielzeug/focus';

restoreFocus(triggerEl, { fallback: () => document.body, preventScroll: true });
```

---

### `captureFocus()`

```ts
function captureFocus(options?: CaptureFocusOptions): FocusRestoration;
```

Captures a focus target (default: the deepest active element, including inside shadow roots) and returns a restoration handle. Dispose the handle when the owning scope unmounts.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `CaptureFocusOptions` | Optional `target`, `fallback`, `preventScroll`, and `signal`. |

**Returns:** `FocusRestoration`.

```ts
import { captureFocus } from '@vielzeug/focus';

const restore = captureFocus();

dialog.showModal();
dialog.addEventListener('close', () => {
  restore.restore();
  restore.dispose();
}, { once: true });
```

| `FocusRestoration` member | Return | Contract |
| --- | --- | --- |
| `restore()` | `boolean` | Restores focus to the captured target (or fallback). Returns `false` after `dispose()`. |
| `dispose()` | `void` | Aborts `disposalSignal` and marks the handle disposed. Idempotent. |
| `disposed` | `boolean` | `true` after first `dispose()`. |
| `disposalSignal` | `AbortSignal` | Aborts when the handle is disposed. |
| `[Symbol.dispose]()` | `void` | Calls `dispose()`. |

## Types

```ts
type MaybeGetter<T> = T | (() => T);

type ListNavigationAction = 'first' | 'last' | 'next' | 'prev';
type ListKeyAction = ListNavigationAction | 'typeahead';

type ListNavigationOptions<T> = {
  direction?: 'ltr' | 'rtl' | (() => 'ltr' | 'rtl');
  disabled?: MaybeGetter<boolean | undefined>;
  getItemLabel?: (item: T, index: number) => string;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListNavigationAction, string[]>>;
  loop?: boolean;
  onNavigate?: (action: ListKeyAction, index: number, event?: KeyboardEvent) => void;
  orientation?: 'both' | 'horizontal' | 'vertical' | (() => 'both' | 'horizontal' | 'vertical');
  signal?: AbortSignal;
  typeaheadDelayMs?: number;
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
  target?: FocusTarget;
};

type FocusRestoration = {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  dispose(): void;
  restore(): boolean;
  [Symbol.dispose](): void;
};
```

`typeaheadDelayMs` defaults to `500`. Non-finite or non-positive values are ignored and fall back to the default.

## Errors

`@vielzeug/focus` does not export custom error classes in v1.
