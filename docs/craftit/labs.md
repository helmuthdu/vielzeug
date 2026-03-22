---
title: Craftit Labs - Controllers & Composables
description: Experimental headless controllers and DOM composables for interactive widgets.
---

# Craftit Labs

Craftit labs contains low-level APIs for advanced component logic. These are intentionally more flexible and can evolve faster than the main `@vielzeug/craftit` entrypoint.

[[toc]]

## Import

```ts
import {
  createCheckableControl,
  createListNavigation,
  createOverlayControl,
  createSelectionControl,
  observeIntersection,
  observeMedia,
  observeResize,
  useA11yControl,
} from '@vielzeug/craftit/labs';
```

## Overview

- `createListNavigation` - keyboard/list focus navigation with rich result metadata.
- `createOverlayControl` - open/close/toggle orchestration with typed open/close reasons.
- `createSelectionControl` - key-driven single/multiple selection controller.
- `useA11yControl` - ARIA/label/helper wiring for custom controls.
- `createCheckableControl` - toggle behavior for checkbox/radio/switch style controls.
- `observeResize`, `observeIntersection`, `observeMedia` - reactive observer composables.

## `createListNavigation`

Navigation methods return a `ListNavigationResult` object instead of a bare index.

```ts
type ListNavigationResultReason = 'empty' | 'moved' | 'no-enabled-item' | 'unchanged';

type ListNavigationResult = {
  index: number;
  moved: boolean;
  reason: ListNavigationResultReason;
  wrapped: boolean;
};

type ListNavigationController<T> = {
  first: () => ListNavigationResult;
  getActiveItem: () => T | undefined;
  getEnabledIndex: (index: number) => ListNavigationResult;
  last: () => ListNavigationResult;
  next: () => ListNavigationResult;
  prev: () => ListNavigationResult;
  reset: () => void;
  set: (index: number) => ListNavigationResult;
};
```

### Why this shape improves DX

- You can branch on `reason` (`'empty'`, `'no-enabled-item'`, etc.) without manually inferring from `-1`.
- `wrapped` is explicit for telemetry and UX decisions.
- `moved` tells you if focus/selection actually changed.

### Example

```ts
const nav = createListNavigation({
  getIndex: () => focusedIndex.value,
  getItems: () => options.value,
  isItemDisabled: (item) => item.disabled,
  loop: true,
  setIndex: (index) => {
    focusedIndex.value = index;
  },
});

const result = nav.next();

if (result.reason === 'empty' || result.reason === 'no-enabled-item') {
  focusedIndex.value = -1;
}
```

## `createOverlayControl`

Overlay transitions are reason-aware.

```ts
type OverlayOpenReason = 'programmatic' | 'toggle' | 'trigger';
type OverlayCloseReason = 'escape' | 'outside-click' | 'programmatic' | 'toggle';

type OverlayChangeContext = {
  reason: OverlayOpenReason | OverlayCloseReason;
};

type OverlayControlOptions = {
  getBoundaryElement: () => HTMLElement | null;
  getPanelElement?: () => HTMLElement | null;
  getTriggerElement?: () => HTMLElement | null;
  isDisabled?: () => boolean;
  isOpen: () => boolean;
  onClose?: (reason: OverlayCloseReason) => void;
  onOpen?: (reason: OverlayOpenReason) => void;
  positioner?: OverlayPositioner;
  restoreFocus?: boolean | (() => boolean);
  setOpen: (next: boolean, context: OverlayChangeContext) => void;
};

type OverlayControl = {
  bindOutsideClick: (target?: Document | HTMLElement, capture?: boolean) => () => void;
  close: (opts?: { reason?: OverlayCloseReason; restoreFocus?: boolean }) => void;
  open: (opts?: { reason?: OverlayOpenReason }) => void;
  toggle: () => void;
};
```

### Example

```ts
const overlay = createOverlayControl({
  getBoundaryElement: () => host,
  getPanelElement: () => panel,
  getTriggerElement: () => trigger,
  isOpen: () => isOpen.value,
  setOpen: (next, context) => {
    isOpen.value = next;
    emit(next ? 'open' : 'close', { reason: context.reason });
  },
  onClose: (reason) => {
    if (reason === 'escape') {
      // Optional behavior for escape-specific close.
    }
  },
});

overlay.open({ reason: 'trigger' });
```

## `createSelectionControl`

Selection is key-driven and item-shape agnostic.

```ts
type SelectionMode = 'multiple' | 'single';

type SelectionControllerOptions<T> = {
  findByKey: (key: string) => T | undefined;
  getMode: () => SelectionMode;
  getSelected: () => T[];
  keyExtractor: (item: T) => string;
  setSelected: (next: T[]) => void;
};

type SelectionController = {
  clear: () => void;
  isSelected: (key: string) => boolean;
  remove: (key: string) => void;
  select: (key: string) => void;
  serialize: (separator?: string) => string;
  toggle: (key: string) => void;
};
```

### Why this shape improves DX

- No implicit item contract (`{ value, label }`) is required.
- Works with any domain model as long as keys can be extracted/resolved.
- Selection operations stay consistent across simple and rich item objects.

### Example

```ts
const selection = createSelectionControl({
  getMode: () => (multiple.value ? 'multiple' : 'single'),
  getSelected: () => selectedItems.value,
  setSelected: (next) => {
    selectedItems.value = next;
  },
  keyExtractor: (item) => item.id,
  findByKey: (id) => allItems.value.find((item) => item.id === id),
});

selection.toggle('item-1');
selection.select('item-2');
const serialized = selection.serialize(',');
```

## `useA11yControl`

`useA11yControl` now uses explicit helper tone semantics and DOM-based label detection (no text heuristics).

```ts
type A11yTone = 'default' | 'error';

type A11yControlConfig = {
  checked?: () => 'true' | 'false' | 'mixed' | undefined;
  helperId?: string;
  helperText?: () => string | undefined;
  helperTone?: () => A11yTone;
  invalid?: () => boolean;
  labelId?: string;
  role: string;
};

type A11yControlHandle = {
  helperId: string;
  labelId: string;
};
```

### Required template markers

`useA11yControl` expects these markers in your template:

- `[data-a11y-label]` for label wiring (`aria-labelledby`)
- `[data-a11y-helper]` for helper/error wiring (`aria-describedby`)

### Example

```ts
const a11y = useA11yControl(host, {
  role: 'checkbox',
  checked: () => (checked.value ? 'true' : 'false'),
  invalid: () => Boolean(error.value),
  helperText: () => error.value || helper.value,
  helperTone: () => (error.value ? 'error' : 'default'),
});

return html`
  <span data-a11y-label id=${a11y.labelId}><slot></slot></span>
  <div data-a11y-helper id=${a11y.helperId} aria-live="polite" hidden></div>
`;
```

## Observer composables

### `observeResize(el)`

```ts
const size = observeResize(element);
// size.value => { width, height }
```

### `observeIntersection(el, options?)`

```ts
const entry = observeIntersection(element, { threshold: 0.5 });
// entry.value => IntersectionObserverEntry | null
```

### `observeMedia(query)`

```ts
const prefersReducedMotion = observeMedia('(prefers-reduced-motion: reduce)');
// prefersReducedMotion.value => boolean
```

## `createCheckableControl`

For checkable controls (checkbox/radio/switch style behavior), use `createCheckableControl` from labs. See Buildit `checkbox`, `radio`, and `switch` for full usage patterns.

## Exports from `@vielzeug/craftit/labs`

```ts
export {
  createListNavigation,
  createOverlayControl,
  createSelectionControl,
  useA11yControl,
  createCheckableControl,
  observeIntersection,
  observeMedia,
  observeResize,
} from '@vielzeug/craftit/labs';
```

## See also

- [Craftit API](./api.md)
- [Craftit Usage](./usage.md)
- [Buildit docs](/buildit/)
