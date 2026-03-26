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
  createChoiceFieldControl,
  createListControl,
  createOverlayControl,
  createTextFieldControl,
} from '@vielzeug/craftit/controls';

import { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';
```

## Overview

- `createTextFieldControl` - text-field controller with stable ids, validation hooks, and integrated assistive state.
- `createChoiceFieldControl` - single/multi-select controller for selects, comboboxes, and grouped checkboxes.
- `createCheckableFieldControl` - high-level checkbox/radio/switch controller that bundles checkable state, a11y wiring, and press handling.
- `createListControl` - keyboard/list focus navigation with rich result metadata.
- `createOverlayControl` - open/close/toggle orchestration with typed open/close reasons.

Observer APIs (`resizeObserver`, `intersectionObserver`, `mediaObserver`) are documented under the `@vielzeug/craftit/observers` entrypoint.

## Which Control Do I Choose?

For normal field authoring, the intended public choice is now just three field controllers:

- Use `createTextFieldControl` for input-like fields with one string value: input, textarea, masked text inputs, and similar controls.
- Use `createChoiceFieldControl` when the field owns a selected item list or CSV-style form value: select, combobox, multi-select, checkbox-group.
- Use `createCheckableFieldControl` for single checkable widgets: checkbox, radio, switch.

Everything else in this entrypoint is either a generic non-field primitive (`createListControl`, `createOverlayControl`, `createPressControl`) or a lower-level escape hatch for advanced widgets (`createA11yControl`).

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

## `createTextFieldControl`

`createTextFieldControl` is the base authoring helper for input-like fields. It owns stable ids, field state, validation triggering, and assistive state in one place.

```ts
const field = createTextFieldControl({
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

## `createChoiceFieldControl`

`createChoiceFieldControl` is the shared base for select-like components.

```ts
const choice = createChoiceFieldControl({
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

`createA11yControl` remains available as a low-level primitive for advanced widgets that are not already covered by the higher-level field helpers.

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

`createA11yControl` expects these markers in your template:

- `[data-a11y-label]` for label wiring (`aria-labelledby`)
- `[data-a11y-helper]` for helper/error wiring (`aria-describedby`)

### Example

```ts
const a11y = createA11yControl(host, {
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

## Exports from `@vielzeug/craftit/controls`

```ts
export {
  createCheckableFieldControl,
  createChoiceFieldControl,
  createListControl,
  createOverlayControl,
  createTextFieldControl,
} from '@vielzeug/craftit/controls';

export { intersectionObserver, mediaObserver, resizeObserver } from '@vielzeug/craftit/observers';
```

## See also

- [Craftit API](./api.md)
- [Craftit Usage](./usage.md)
- [Buildit docs](/buildit/)
