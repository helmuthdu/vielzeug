---
title: Refine — API Reference
description: Entry points, import paths, exported symbols, and headless primitives for @vielzeug/refine.
---

# API Reference

[[toc]]

## Import Paths

Every published subpath and what it does:

| Import path                            | Purpose                                                                |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `@vielzeug/refine/styles`               | Global design tokens and base styles — **import before components**    |
| `@vielzeug/refine/styles/theme.css`     | Theme token stylesheet (direct CSS path)                               |
| `@vielzeug/refine/styles/animation.css` | Animation helpers                                                      |
| `@vielzeug/refine/styles/layers.css`    | Cascade layer definitions                                              |
| `@vielzeug/refine/styles/preflight.css` | CSS reset / preflight (importable separately to opt out)               |
| `@vielzeug/refine/<component>`          | Register a single component as a custom element                        |
| `@vielzeug/refine`                      | Register all published components + re-export shared symbols           |
| `@vielzeug/refine/headless`             | Headless primitive controllers for custom component authoring          |
| `@vielzeug/refine/testing`              | Test utilities: ARIA helpers, DOM queries, typed mount wrappers        |
| `@vielzeug/refine/types`                | Shared TypeScript types                                                |

Prefer per-component imports to keep bundles small and registration explicit. Import `@vielzeug/refine` only when convenience matters more than granular control.

## Runtime Registration

Register only the elements you need:

```ts
import '@vielzeug/refine/styles';
import '@vielzeug/refine/button';
import '@vielzeug/refine/input';
import '@vielzeug/refine/dialog';
```

Or register everything:

```ts
import '@vielzeug/refine/styles';
import '@vielzeug/refine';
```

## Published Component Subpaths

```ts
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/async';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/avatar-group';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/box';
import '@vielzeug/refine/breadcrumb';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/calendar';
import '@vielzeug/refine/card';
import '@vielzeug/refine/carousel';
import '@vielzeug/refine/chat-message';
import '@vielzeug/refine/checkbox';
import '@vielzeug/refine/checkbox-group';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/copy-command';
import '@vielzeug/refine/combobox';
import '@vielzeug/refine/command-palette';
import '@vielzeug/refine/datagrid';
import '@vielzeug/refine/date-picker';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/file-input';
import '@vielzeug/refine/form';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/grid-item';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/menu';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/number-input';
import '@vielzeug/refine/otp-input';
import '@vielzeug/refine/pagination';
import '@vielzeug/refine/password-strength';
import '@vielzeug/refine/popover';
import '@vielzeug/refine/progress';
import '@vielzeug/refine/radio';
import '@vielzeug/refine/radio-group';
import '@vielzeug/refine/rating';
import '@vielzeug/refine/select';
import '@vielzeug/refine/separator';
import '@vielzeug/refine/sidebar';
import '@vielzeug/refine/skeleton';
import '@vielzeug/refine/slider';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/tab-item';
import '@vielzeug/refine/tab-panel';
import '@vielzeug/refine/table';
import '@vielzeug/refine/tabs';
import '@vielzeug/refine/text';
import '@vielzeug/refine/textarea';
import '@vielzeug/refine/time-picker';
import '@vielzeug/refine/toast';
import '@vielzeug/refine/tooltip';
import '@vielzeug/refine/typing-indicator';
```

## Shared Exported Symbols

The package root re-exports these symbols alongside component registration:

| Symbol                  | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `toast`                 | Programmatic toast notification singleton                     |
| `lifecycleSignal()`     | `AbortSignal` tied to a Ore component's cleanup             |
| `createTextField()`     | Headless text/textarea field controller                       |
| `createChoiceField()`   | Headless single/multi-select controller                       |
| `createCheckable()`     | Headless checkbox/radio controller                            |
| `createOverlayControl()`| Headless open/close/toggle for overlays                       |
| `createOptionList()`    | Headless dropdown list with open state, navigation, positioner|
| `createListControl()`   | Keyboard-navigable list without open state                    |
| Tag constants           | `BUTTON_TAG`, `INPUT_TAG`, `DIALOG_TAG`, …                    |
| Context constants       | `FORM_CTX`, `TABS_CTX`, `CHECKBOX_GROUP_CTX`, …               |
| Component prop types    | `OreButtonProps`, `OreInputEvents`, …                           |

## TypeScript Types

Every component exports types named after the component. Import from the component subpath:

```ts
import type { OreButtonProps, OreButtonEvents } from '@vielzeug/refine/button';
import type { OreInputProps, OreInputEvents } from '@vielzeug/refine/input';
import type { OreDialogProps, OreDialogEvents } from '@vielzeug/refine/dialog';
```

Shared types used across components:

| Type                | Path                    | Values                                                                              |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `ThemeColor`        | `@vielzeug/refine/types` | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`          |
| `VisualVariant`     | `@vielzeug/refine/types` | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'`     |
| `SurfaceVariant`    | `@vielzeug/refine/types` | `VisualVariant \| 'glass'`                                                          |
| `ComponentSize`     | `@vielzeug/refine/types` | `'sm' \| 'md' \| 'lg'`                                                              |
| `RoundedSize`       | `@vielzeug/refine/types` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`               |
| `PaddingSize`       | `@vielzeug/refine/types` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                           |
| `AddEventListeners` | `@vielzeug/refine/types` | Mixin that adds typed `addEventListener` / `removeEventListener` overloads          |

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
- [Typing Indicator](./components/typing-indicator.md)

### Content
- [Avatar](./components/avatar.md)
- [Breadcrumb](./components/breadcrumb.md)
- [Card](./components/card.md)
- [Carousel](./components/carousel.md)
- [Chat Message](./components/chat-message.md)
- [Copy Command](./components/copy-command.md)
- [Icon](./components/icon.md)
- [Pagination](./components/pagination.md)
- [Separator](./components/separator.md)
- [Table](./components/table.md)
- [Text](./components/text.md)

### Overlay
- [Command Palette](./components/command-palette.md)
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

Headless primitives let you build fully custom components that share Refine's interaction logic — keyboard navigation, overlay management, field validation — without any Refine styling.

Import from `@vielzeug/refine/headless`:

```ts
import {
  lifecycleSignal,
  createTextField,
  createChoiceField,
  createCheckable,
  createOverlayControl,
  createOptionList,
  createListControl,
} from '@vielzeug/refine/headless';
```

All stateful primitives require a `signal: AbortSignal` option. Use `lifecycleSignal(onCleanup)` inside a Ore `setup()` function to produce one tied to the component's lifecycle.

### `lifecycleSignal(onCleanup)`

```ts
lifecycleSignal(onCleanup: (fn: () => void) => void): AbortSignal
```

Creates an `AbortSignal` that aborts when the Ore component disconnects. Pass it as `signal` to any stateful headless primitive.

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

Composed primitive for dropdown option lists (select, combobox, menu). Owns `isOpen`, `focusedIndex`, the dropdown positioner, list navigation, and overlay wiring.

Required DOM accessors (top-level options, not nested): `getBoundary`, `getPanel`, `getReference`. Missing any of them throws `RefineConfigError`.

Key members: `isOpen`, `focusedIndex`, `ariaExpanded`, `ariaActiveDescendant`, `open(reason?)`, `close(reason?)`, `toggle(openReason?, closeReason?)`, `navigate(action)` (`'first' | 'last' | 'next' | 'prev'`), `set(index)`, `getActiveItem()`, `handleKeydown()`, `scrollFocusedIntoView()`, `updatePosition()`.

### `createListControl(options)`

```ts
createListControl<T>(options: ListNavigationOptions<T>): ListControl<T>
```

Keyboard-navigable list without open state. Supports vertical/horizontal/omni navigation, disabled-item skipping, looping, and typeahead. Navigation methods return the resolved index, or `-1` when no enabled item was found.

### Other Headless Exports

| Export                       | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
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
| `dispatchKeyboardAction()`   | Low-level keymap dispatcher                                        |
| `createSelectionControl()`   | Single/multi/none row-selection controller (used by the data grid) |
| `createSortControl()`        | Client-side column sort controller — cycles asc → desc → none      |
| `announce()`                 | ARIA live-region announcer (polite or assertive)                   |
| `syncedSignal()`             | Local writable signal synced from a `Reactive` source              |
| `parseStringTriggers()`      | Parse comma-separated trigger strings against an allowed set       |
| `getChoiceLabel()`           | Read the display label from `<ore-option>` or similar              |
| `getLightChildrenByTag()`    | Collect light-DOM children matching a tag name                     |
| `parseIso()`                 | Parse an ISO `yyyy-MM-dd` string to `Temporal.PlainDate`, `null` if invalid |
| `toIsoString()`              | Serialise a `Temporal.PlainDate` to an ISO `yyyy-MM-dd` string      |
| `formatDisplayDate()`        | Format a `Temporal.PlainDate` for display in a given locale        |
| `toFiniteNumber()`           | Parse a value to a finite number, `undefined` for non-finite       |
| `toFiniteNumberOr()`         | Parse a value to a finite number with a fallback                   |
| `toPositiveStep()`           | Coerce a step value to a positive finite number with a fallback    |
