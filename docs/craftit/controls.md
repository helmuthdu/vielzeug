---
title: Craftit Controls - Headless Interaction APIs
description: Stable headless controls and DOM composables for interactive widgets.
---

This page documents the `@vielzeug/craftit/controls` entrypoint. These APIs are the stable headless interaction layer for advanced component logic such as overlays, list navigation, and field wiring.

[[toc]]

## Import

```ts
import {
  createCheckableFieldControl,
  createChoiceField,
  createListControl,
  createListKeyControl,
  createOverlayControl,
  createPopupListControl,
  createPressControl,
  createSliderControl,
  createSpinnerControl,
  createTextField,
  type CheckableChangePayload,
  type OverlayCloseDetail,
  type OverlayCloseReason,
  type OverlayOpenDetail,
  type OverlayOpenReason,
} from '@vielzeug/craftit/controls';

import { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';
```

## Overview

- `createTextField` - text-field controller with stable ids, validation hooks, and assistive state.
- `createChoiceField` - choice-field controller for single/multi-select and CSV-backed form values.
- `createCheckableFieldControl` - high-level checkbox/radio/switch controller that bundles checkable state, a11y wiring, and press handling.
- `createListControl` - keyboard/list focus navigation with rich result metadata.
- `createListKeyControl` - keyboard adapter that maps arrow/home/end keys to a `ListControl`.
- `createPressControl` - click/keydown press handler with key filtering and disabled state.
- `createOverlayControl` - open/close/toggle orchestration with typed open/close reasons.
- `createPopupListControl` - combo of overlay + list navigation for popup list widgets.
- `createSliderControl` - range input value/step/bounds management.
- `createSpinnerControl` - number spinner increment/decrement logic.

Observer APIs (`resizeObserver`, `intersectionObserver`, `mediaObserver`) are documented under the `@vielzeug/craftit/observers` entrypoint.

## Which Control Do I Choose?

For normal field authoring, use the dedicated field helpers:

- Use `createTextField(options)` for input-like fields with one string value: input, textarea, and similar controls.
- Use `createChoiceField(options)` when the field owns a selected item list or CSV-style form value: select, combobox, multi-select, checkbox-group.
- Use `createCheckableFieldControl(options)` for single checkable widgets: checkbox, radio, switch.

Everything else is a generic non-field primitive for interaction:

- `createListControl` / `createListKeyControl` — focus list navigation
- `createPressControl` — click/keydown press with disabled guard
- `createOverlayControl` — open/close lifecycle with reason tracking
- `createPopupListControl` — popup list combining overlay + list navigation
- `createSliderControl` — range slider value/bounds management
- `createSpinnerControl` — numeric spinner increment/decrement

## `createListControl`

Navigation methods return a `ListControlResult` object instead of a bare index.

```ts
type ListControlResultReason = 'empty' | 'moved' | 'no-enabled-item' | 'unchanged';

type ListControlResult = {
  index: number;
  moved: boolean;
  reason: ListControlResultReason;
  wrapped: boolean;
};

type ListControl<T> = {
  first: () => ListControlResult;
  getActiveItem: () => T | undefined;
  getEnabledIndex: (index: number) => ListControlResult;
  last: () => ListControlResult;
  next: () => ListControlResult;
  prev: () => ListControlResult;
  reset: () => void;
  set: (index: number) => ListControlResult;
};
```

### Why this shape improves DX

- You can branch on `reason` (`'empty'`, `'no-enabled-item'`, etc.) without manually inferring from `-1`.
- `wrapped` is explicit for telemetry and UX decisions.
- `moved` tells you if focus/selection actually changed.

### Navigation Example

```ts
const nav = createListControl({
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
type OverlayOpenReason = 'programmatic' | 'trigger';
type OverlayCloseReason = 'escape' | 'outside-click' | 'programmatic' | 'trigger';

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

### A11y Example

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

## `createTextField`

Use `createTextField` for input-like fields. It owns stable ids, field state, validation triggering, and assistive state in one place.

```ts
const field = createTextField({
  context: formCtx,
  error,
  helper,
  label,
  labelPlacement,
  maxLength,
  name,
  prefix: 'input',
  value,
});

const { assistive, fieldId, helperId, errorId, labelInsetId, labelOutsideId, value: inputValue } = field;
```

`assistive.value` includes:

- `text` and `isError` for helper/error output
- `hasCounter`, `counterText`, `counterNearLimit`, and `counterAtLimit` for maxlength UX
- `showHelper`, `hasError`, and `hidden` so templates do not need to duplicate fallback logic

## `createChoiceField`

Use `createChoiceField` for select-like components.

```ts
const choice = createChoiceField({
  context: formCtx,
  error,
  getValue: (item) => item.value,
  helper,
  label,
  labelPlacement,
  mapControlledValue: (value) => ({ label: '', value }),
  multiple,
  name,
  prefix: 'combobox',
  value,
});

choice.selectedItems.value;
choice.formValue.value;
choice.assistive.value.text;
```

Use this when the UI needs to manage selected items, selected values, or CSV-backed form values.

## `createCheckableFieldControl`

`createCheckableFieldControl` is the preferred authoring helper for checkbox, radio, and switch components. It wraps the raw checkable state, accessibility wiring, and press handling into one control.

```ts
const checkable = createCheckableFieldControl({
  checked,
  disabled,
  error,
  helper,
  host: host.el,
  onToggle: (payload) => emit('change', payload),
  prefix: 'switch',
  role: 'switch',
  validateOn,
  value,
});

const { a11y, control, press } = checkable;
```

This keeps component code focused on rendering and any truly component-specific behavior.

## `createA11yControl`

`createA11yControl` is an internal helper used by the higher-level field controls. It is not part of the public `@vielzeug/craftit/controls` surface — use `createCheckableFieldControl`, `createTextField`, or `createChoiceField` instead.

## Exports from `@vielzeug/craftit/controls`

```ts
export {
  createCheckableFieldControl,
  createChoiceField,
  createListControl,
  createListKeyControl,
  createOverlayControl,
  createPopupListControl,
  createPressControl,
  createSliderControl,
  createSpinnerControl,
  createTextField,
  type CheckableChangePayload,
  type OverlayCloseDetail,
  type OverlayCloseReason,
  type OverlayOpenDetail,
  type OverlayOpenReason,
} from '@vielzeug/craftit/controls';

export { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';
```

## See also

- [Craftit API](./api.md)
- [Craftit Usage](./usage.md)
- [Buildit docs](/buildit/)
