---
title: Craftit Controls — Headless interaction APIs
description: Stable headless controls from @vielzeug/craftit/controls for fields, lists, press handling, overlays, popup lists, sliders, and spinners.
---

This page documents the `@vielzeug/craftit/controls` entry point.

[[toc]]

## Import

```ts
import {
  createCheckableFieldControl,
  createChoiceField,
  createListControl,
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
```

## Overview

- `createTextField` — authoring helper for input-like string fields
- `createChoiceField` — authoring helper for select-like single/multi choice fields
- `createCheckableFieldControl` — authoring helper for checkbox, radio, and switch widgets
- `createListControl` — enabled-item navigation plus keyboard dispatch
- `createPressControl` — normalized pointer/keyboard press handling
- `createOverlayControl` — reason-aware open/close/toggle orchestration
- `createPopupListControl` — popup list composition built from overlay + list + ARIA sync
- `createSliderControl` — min/max/step math for slider-like widgets
- `createSpinnerControl` — numeric increment/decrement and keyboard stepping

## Which control do I choose?

Use the field helpers when the component is a form control:

- `createTextField(options)` for text inputs and textareas
- `createChoiceField(options)` for select, combobox, multiselect, and grouped-choice fields
- `createCheckableFieldControl(options)` for checkbox, radio, and switch widgets

Use the interaction primitives everywhere else:

- `createListControl` for roving focus and enabled-item navigation
- `createPressControl` for Enter/Space + click activation
- `createOverlayControl` for popup open/close behavior
- `createPopupListControl` when you need popup navigation + overlay behavior together
- `createSliderControl` for range math
- `createSpinnerControl` for number input stepping

## createListControl()

`createListControl()` owns both navigation methods and keyboard mapping.

```ts
type ListKeyAction = 'first' | 'last' | 'next' | 'prev';

type ListNavigationOptions<T> = {
  disabled?: () => boolean;
  getIndex: () => number;
  getItems: () => T[];
  isItemDisabled?: (item: T, index: number) => boolean;
  keys?: Partial<Record<ListKeyAction, string[]>> | (() => Partial<Record<ListKeyAction, string[]>>);
  loop?: boolean;
  onInvoke?: (action: ListKeyAction, result: ListControlResult, event: KeyboardEvent) => void;
  setIndex: (index: number) => void;
};
```

```ts
const list = createListControl({
  getIndex: () => focusedIndex.value,
  getItems: () => options.value,
  isItemDisabled: (item) => item.disabled,
  keys: { next: ['ArrowDown'], prev: ['ArrowUp'] },
  loop: true,
  onInvoke: (action, result) => {
    if (result.moved) console.log(action, result.index);
  },
  setIndex: (index) => {
    focusedIndex.value = index;
  },
});

list.handleKeydown(event);
const result = list.next();
```

Navigation methods return a `ListControlResult`:

```ts
type ListControlResult = {
  index: number;
  moved: boolean;
  reason: 'empty' | 'moved' | 'no-enabled-item' | 'unchanged';
  wrapped: boolean;
};
```

## createPressControl()

Use `createPressControl()` when a widget should activate from both click and keyboard.

```ts
const press = createPressControl({
  disabled: () => disabled.value,
  keys: ['Enter', ' '],
  onPress: (originalEvent, trigger) => {
    console.log(trigger, originalEvent.type);
    toggle();
  },
});

host.on('click', press.handleClick);
host.on('keydown', press.handleKeydown);
```

## createOverlayControl()

Overlay transitions are reason-aware.

```ts
const overlay = createOverlayControl({
  getBoundaryElement: () => host.el,
  getPanelElement: () => panelRef.value,
  getTriggerElement: () => triggerRef.value,
  isOpen: () => open.value,
  onClose: (reason) => console.log('closed', reason),
  onOpen: (reason) => console.log('opened', reason),
  restoreFocus: true,
  setOpen: (next, context) => {
    open.value = next;
    lastReason.value = context.reason;
  },
});

const stopOutsideClick = overlay.bindOutsideClick();
overlay.open({ reason: 'trigger' });
overlay.close({ reason: 'escape' });
```

## createPopupListControl()

Use `createPopupListControl()` for popup widgets such as comboboxes, menus, and selects.

```ts
const popupList = createPopupListControl({
  ariaSync: { role: 'listbox' },
  getBoundaryElement: () => host.el,
  getIndex: () => focusedIndex.value,
  getItems: () => items.value,
  getPanelElement: () => panelRef.value,
  getTriggerElement: () => triggerRef.value,
  isOpen: () => open.value,
  keyboardMapping: { next: ['ArrowDown'], prev: ['ArrowUp'] },
  listId: listId.value,
  onNavigate: (_action, index) => {
    focusedIndex.value = index;
  },
  setIndex: (index) => {
    focusedIndex.value = index;
  },
  setOpen: (next) => {
    open.value = next;
  },
});

popupList.handleListKeydown(event);
popupList.syncTriggerAria(triggerRef.value!);
popupList.syncPanelAria(panelRef.value!);
```

It exposes the composed `list` and `overlay` controls for advanced cases.

## createSliderControl()

`createSliderControl()` handles slider math only. You wire the DOM separately.

```ts
const slider = createSliderControl({
  min: () => props.min.value,
  max: () => props.max.value,
  step: () => props.step.value,
});

const next = slider.nextFromKey('ArrowRight', value.value);
const snapped = slider.snap(13.4);
const percent = slider.toPercent(value.value);
const fromPointer = slider.fromClientX(clientX, rect);
```

## createSpinnerControl()

Use `createSpinnerControl()` for number inputs and stepper UIs.

```ts
const spinner = createSpinnerControl({
  commit: (next, originalEvent) => {
    value.value = next == null ? '' : String(next);
    emitChange(originalEvent);
  },
  disabled: () => props.disabled.value,
  largeStep: () => 10,
  max: () => props.max.value,
  min: () => props.min.value,
  parse: () => (value.value === '' ? null : Number(value.value)),
  readonly: () => props.readonly.value,
  step: () => props.step.value,
});

spinner.incrementBy(1, event);
spinner.handleKeydown(event);
spinner.atMin();
spinner.atMax();
```

## createTextField()

Use `createTextField()` for components that own a single text value.

```ts
const field = createTextField({
  elementRef: inputRef,
  error: props.error,
  helper: props.helper,
  label: props.label,
  maxLength: props.maxLength,
  prefix: 'input',
  value: props.value,
});

field.value.value;
field.assistive.value.text;
field.clear();
field.triggerValidation('change');
```

It bundles ids, disabled/readonly state, assistive text, validation triggers, and input lifecycle wiring.

## createChoiceField()

Use `createChoiceField()` for select-like controls.

```ts
const choice = createChoiceField({
  getValue: (item) => item.value,
  helper: props.helper,
  label: props.label,
  multiple: props.multiple,
  prefix: 'select',
  value: props.value,
});

choice.selectedItems.value;
choice.formValue.value;
choice.assistive.value.hidden;
```

It keeps selected items, derived form value, ids, and assistive state together.

## createCheckableFieldControl()

Use `createCheckableFieldControl()` for checkbox, radio, and switch widgets.

```ts
const checkable = createCheckableFieldControl({
  checked: props.checked,
  disabled: props.disabled,
  error: props.error,
  helper: props.helper,
  host: host.el,
  onToggle: (payload) => emit('change', payload),
  prefix: 'switch',
  role: 'switch',
  value: props.value,
});

checkable.control.checked.value;
checkable.press.handleClick(event);
checkable.a11y.sync(controlElement);
```

## See also

- [Craftit API](./api.md)
- [Craftit Usage Guide](./usage.md)
- [Buildit docs](/buildit/)
