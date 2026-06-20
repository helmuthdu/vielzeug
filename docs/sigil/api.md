---
title: Sigil — API Reference
description: Entry points, import paths, exported symbols, and headless primitives for @vielzeug/sigil.
---

# API Reference

[[toc]]

## Import Paths

Every published subpath and what it does:

| Import path                            | Purpose                                                                |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `@vielzeug/sigil/styles`               | Global design tokens and base styles — **import before components**    |
| `@vielzeug/sigil/styles/theme.css`     | Theme token stylesheet (direct CSS path)                               |
| `@vielzeug/sigil/styles/animation.css` | Animation helpers                                                      |
| `@vielzeug/sigil/styles/layers.css`    | Cascade layer definitions                                              |
| `@vielzeug/sigil/styles/preflight.css` | CSS reset / preflight (importable separately to opt out)               |
| `@vielzeug/sigil/<component>`          | Register a single component as a custom element                        |
| `@vielzeug/sigil`                      | Register all published components + re-export shared symbols           |
| `@vielzeug/sigil/headless`             | Headless primitive controllers for custom component authoring          |
| `@vielzeug/sigil/testing`              | Test utilities: ARIA helpers, DOM queries, typed mount wrappers        |
| `@vielzeug/sigil/types`                | Shared TypeScript types                                                |

Prefer per-component imports to keep bundles small and registration explicit. Import `@vielzeug/sigil` only when convenience matters more than granular control.

## Runtime Registration

Register only the elements you need:

```ts
import '@vielzeug/sigil/styles';
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';
import '@vielzeug/sigil/dialog';
```

Or register everything:

```ts
import '@vielzeug/sigil/styles';
import '@vielzeug/sigil';
```

## Published Component Subpaths

```ts
import '@vielzeug/sigil/accordion';
import '@vielzeug/sigil/accordion-item';
import '@vielzeug/sigil/alert';
import '@vielzeug/sigil/async';
import '@vielzeug/sigil/avatar';
import '@vielzeug/sigil/avatar-group';
import '@vielzeug/sigil/badge';
import '@vielzeug/sigil/box';
import '@vielzeug/sigil/breadcrumb';
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/button-group';
import '@vielzeug/sigil/calendar';
import '@vielzeug/sigil/card';
import '@vielzeug/sigil/carousel';
import '@vielzeug/sigil/checkbox';
import '@vielzeug/sigil/checkbox-group';
import '@vielzeug/sigil/chip';
import '@vielzeug/sigil/copy-command';
import '@vielzeug/sigil/combobox';
import '@vielzeug/sigil/datagrid';
import '@vielzeug/sigil/date-picker';
import '@vielzeug/sigil/dialog';
import '@vielzeug/sigil/drawer';
import '@vielzeug/sigil/file-input';
import '@vielzeug/sigil/form';
import '@vielzeug/sigil/grid';
import '@vielzeug/sigil/grid-item';
import '@vielzeug/sigil/icon';
import '@vielzeug/sigil/input';
import '@vielzeug/sigil/menu';
import '@vielzeug/sigil/navbar';
import '@vielzeug/sigil/number-input';
import '@vielzeug/sigil/otp-input';
import '@vielzeug/sigil/pagination';
import '@vielzeug/sigil/password-strength';
import '@vielzeug/sigil/popover';
import '@vielzeug/sigil/progress';
import '@vielzeug/sigil/radio';
import '@vielzeug/sigil/radio-group';
import '@vielzeug/sigil/rating';
import '@vielzeug/sigil/select';
import '@vielzeug/sigil/separator';
import '@vielzeug/sigil/sidebar';
import '@vielzeug/sigil/skeleton';
import '@vielzeug/sigil/slider';
import '@vielzeug/sigil/switch';
import '@vielzeug/sigil/tab-item';
import '@vielzeug/sigil/tab-panel';
import '@vielzeug/sigil/table';
import '@vielzeug/sigil/tabs';
import '@vielzeug/sigil/text';
import '@vielzeug/sigil/textarea';
import '@vielzeug/sigil/time-picker';
import '@vielzeug/sigil/toast';
import '@vielzeug/sigil/tooltip';
```

## Shared Exported Symbols

The package root re-exports these symbols alongside component registration:

| Symbol                  | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `toast`                 | Programmatic toast notification singleton                     |
| `lifecycleSignal()`     | `AbortSignal` tied to a Craft component's cleanup             |
| `createTextField()`     | Headless text/textarea field controller                       |
| `createChoiceField()`   | Headless single/multi-select controller                       |
| `createCheckable()`     | Headless checkbox/radio controller                            |
| `createOverlayControl()`| Headless open/close/toggle for overlays                       |
| `createOptionList()`    | Headless dropdown list with open state, navigation, positioner|
| `createListControl()`   | Keyboard-navigable list without open state                    |
| Tag constants           | `BUTTON_TAG`, `INPUT_TAG`, `DIALOG_TAG`, …                    |
| Context constants       | `FORM_CTX`, `TABS_CTX`, `CHECKBOX_GROUP_CTX`, …               |
| Component prop types    | `SgButtonProps`, `SgInputEvents`, …                           |

## TypeScript Types

Every component exports types named after the component. Import from the component subpath:

```ts
import type { SgButtonProps, SgButtonEvents } from '@vielzeug/sigil/button';
import type { SgInputProps, SgInputEvents } from '@vielzeug/sigil/input';
import type { SgDialogProps, SgDialogEvents } from '@vielzeug/sigil/dialog';
```

Shared types used across components:

| Type                | Path                    | Values                                                                              |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `ThemeColor`        | `@vielzeug/sigil/types` | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`          |
| `VisualVariant`     | `@vielzeug/sigil/types` | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'`     |
| `SurfaceVariant`    | `@vielzeug/sigil/types` | `VisualVariant \| 'glass'`                                                          |
| `ComponentSize`     | `@vielzeug/sigil/types` | `'sm' \| 'md' \| 'lg'`                                                              |
| `RoundedSize`       | `@vielzeug/sigil/types` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`               |
| `PaddingSize`       | `@vielzeug/sigil/types` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                           |
| `AddEventListeners` | `@vielzeug/sigil/types` | Mixin that adds typed `addEventListener` / `removeEventListener` overloads          |

## Component Documentation Index

Per-component API — attributes, events, slots, CSS custom properties:

### Disclosure
- [Accordion](./components/accordion.md)
- [Tabs](./components/tabs.md)

### Feedback
- [Alert](./components/alert.md)
- [Async](./components/async.md)
- [Badge](./components/badge.md)
- [Chip](./components/chip.md)
- [Password Strength](./components/password-strength.md)
- [Progress](./components/progress.md)
- [Skeleton](./components/skeleton.md)
- [Toast](./components/toast.md)

### Content
- [Avatar](./components/avatar.md)
- [Breadcrumb](./components/breadcrumb.md)
- [Card](./components/card.md)
- [Carousel](./components/carousel.md)
- [Copy Command](./components/copy-command.md)
- [Icon](./components/icon.md)
- [Pagination](./components/pagination.md)
- [Separator](./components/separator.md)
- [Table](./components/table.md)
- [Text](./components/text.md)

### Overlay
- [Dialog](./components/dialog.md)
- [Drawer](./components/drawer.md)
- [Menu](./components/menu.md)
- [Popover](./components/popover.md)
- [Tooltip](./components/tooltip.md)

### Inputs
- [Button (+ Button Group)](./components/button.md)
- [Calendar](./components/calendar.md)
- [Checkbox (+ Checkbox Group)](./components/checkbox.md)
- [Combobox](./components/combobox.md)
- [Data Grid](./components/datagrid.md)
- [Date Picker](./components/date-picker.md)
- [File Input](./components/file-input.md)
- [Form](./components/form.md)
- [Input](./components/input.md)
- [Number Input](./components/number-input.md)
- [OTP Input](./components/otp-input.md)
- [Radio (+ Radio Group)](./components/radio.md)
- [Rating](./components/rating.md)
- [Select](./components/select.md)
- [Slider](./components/slider.md)
- [Switch](./components/switch.md)
- [Textarea](./components/textarea.md)
- [Time Picker](./components/time-picker.md)

### Layout
- [Box](./components/box.md)
- [Grid (+ Grid Item)](./components/grid.md)
- [Navbar](./components/navbar.md)
- [Sidebar](./components/sidebar.md)

## Headless API

Headless primitives let you build fully custom components that share Sigil's interaction logic — keyboard navigation, overlay management, field validation — without any Sigil styling.

Import from `@vielzeug/sigil/headless`:

```ts
import {
  lifecycleSignal,
  createTextField,
  createChoiceField,
  createCheckable,
  createOverlayControl,
  createOptionList,
  createListControl,
} from '@vielzeug/sigil/headless';
```

All stateful primitives require a `signal: AbortSignal` option. Use `lifecycleSignal(onCleanup)` inside a Craft `setup()` function to produce one tied to the component's lifecycle.

### `lifecycleSignal(onCleanup)`

```ts
lifecycleSignal(onCleanup: (fn: () => void) => void): AbortSignal
```

Creates an `AbortSignal` that aborts when the Craft component disconnects. Pass it as `signal` to any stateful headless primitive.

### `createTextField(options)`

```ts
createTextField(options: TextFieldOptions): TextFieldHandle
```

Controller for `<input>` and `<textarea>`. Manages value sync, validation triggers, character counter, and event wiring.

Key members: `value` (writable signal), `wire(el, signal?)`, `clear()`, `counter`.

### `createChoiceField(options)`

```ts
createChoiceField(options: ChoiceFieldOptions): ChoiceFieldHandle
```

Controller for single and multi-select inputs. Normalises `string | string[]` values.

Key members: `selectedValues`, `selectedValue`, `selectValue()`, `toggleValue()`, `removeValue()`, `clear()`, `setValues()`, `formValue`.

### `createCheckable(options)`

```ts
createCheckable(options: CheckableOptions): CheckableHandle
```

Controller for checkboxes and radios. Handles checked/indeterminate state, group delegation, and keyboard activation.

Key members: `checked`, `indeterminate`, `toggle()`, `handleClick()`, `handleKeydown()`.

### `createOverlayControl(options)`

```ts
createOverlayControl(options: OverlayControlOptions): OverlayControl
```

Open/close/toggle controller for dialogs, drawers, menus, and popovers. Handles outside-click, focus restoration, and positioner lifecycle.

`dispose()` closes silently — it does not fire `onClose`. Useful for component teardown.

Methods: `open(reason?)`, `close(reason?, restoreFocus?)`, `toggle()`, `dispose()`.

### `createOptionList(options)`

```ts
createOptionList<T extends BaseOptionItem>(options: OptionListOptions<T>): OptionListHandle<T>
```

Composed primitive for dropdown option lists. Owns `isOpen`, `focusedIndex`, the dropdown positioner, list navigation, and overlay wiring.

Required DOM accessors: `dom.getBoundary`, `dom.getPanel`, `dom.getReference`.

Key members: `isOpen`, `focusedIndex`, `open()`, `close()`, `toggle()`, `first()`, `last()`, `next()`, `prev()`, `handleKeydown()`.

### `createListControl(options)`

```ts
createListControl<T>(options: ListNavigationOptions<T>): ListControl<T>
```

Keyboard-navigable list without open state. Supports vertical/horizontal/omni navigation, disabled-item skipping, looping, and typeahead. Navigation methods return the resolved index, or `-1` when no enabled item was found.

### Other Headless Exports

| Export                       | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `createField()`              | Base field: IDs, ARIA signals, label state, validation trigger     |
| `createSpinnerControl()`     | Number spinner step/clamp/keyboard logic                           |
| `createSliderControl()`      | Range slider value/step/clamp/keyboard                             |
| `createSwipeControl()`       | Touch/pointer swipe gesture detection                              |
| `createPaginatedList()`      | Reactive page-index + page-items controller                        |
| `createDatePickerControl()`  | Full date-picker state (calendar, view switching, ISO parsing)     |
| `createDataGridControl()`    | Data grid state (sorting, selection, column management, pagination)|
| `createTypeahead()`          | Standalone typeahead buffer with debounced reset                   |
| `createDropdownPositioner()` | Floating dropdown positioner (wraps Orbit)                         |
| `createDialogFocusControl()` | Dialog-specific focus entry and restoration                        |
| `createInteraction()`        | Unified click/keyboard press handler for interactive elements      |
| `keymap()` / `keymapPresets` | Compose custom keymaps from vertical/horizontal/omni presets       |
| `dispatchKeyboardAction()`   | Low-level keymap dispatcher                                        |
| `announce()`                 | ARIA live-region announcer (polite or assertive)                   |
| `syncedSignal()`             | Local writable signal synced from a `Reactive` source              |
| `parseStringTriggers()`      | Parse comma-separated trigger strings against an allowed set       |
| `getChoiceLabel()`           | Read the display label from `<sg-option>` or similar              |
| `getLightChildrenByTag()`    | Collect light-DOM children matching a tag name                     |
| `toFiniteNumber()`           | Parse a value to a finite number, `undefined` for non-finite       |
| `toFiniteNumberOr()`         | Parse a value to a finite number with a fallback                   |
| `toPositiveStep()`           | Coerce a step value to a positive finite number with a fallback    |
