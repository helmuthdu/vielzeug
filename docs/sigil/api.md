---
title: Sigil — API Reference
description: Entry points, import paths, and exported symbols for @vielzeug/sigil.
---

[[toc]]

## API At a Glance

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `@vielzeug/sigil/styles` | Load shared design tokens and base styles | Sync | Import before any component registration |
| `@vielzeug/sigil/<component>` | Register a specific component as a custom element | Sync | Import styles first or components render without tokens |
| `@vielzeug/sigil` | Register all published components + export shared symbols | Sync | Larger bundle — prefer per-component imports |
| `lifecycleSignal()` | Create an `AbortSignal` tied to a Craft component's cleanup | Sync | Call once per `setup()` — do not share across component instances |
| `createTextField()` | Headless text/textarea field controller | Sync | Requires `signal` from `lifecycleSignal()` |
| `createChoiceField()` | Headless single/multi-select controller | Sync | Requires `signal`; normalises both `string` and `string[]` values |
| `createCheckable()` | Headless checkbox/radio controller | Sync | Wire `handleClick` and `handleKeydown` to the host element |
| `createOverlayControl()` | Headless open/close/toggle for overlays | Sync | `cleanup()` / `dispose()` close silently — do not fire `onClose` |
| `createOptionList()` | Headless dropdown list (open state + navigation + positioner) | Sync | Requires `dom.getBoundary`, `dom.getPanel`, `dom.getReference` |
| `createListControl()` | Keyboard-navigable list (no open state) | Sync | `set(-1)` resets focus; `cleanup()` cancels typeahead timer |
| `toast` | Programmatic toast notification API | Sync | Requires `sg-toast` to be registered and mounted in the DOM |

## Package Entry Points

| Import                                 | Purpose                                                                |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `@vielzeug/sigil`                      | Registers all published components and re-exports shared symbols/types |
| `@vielzeug/sigil/types`                | Shared TypeScript types                                                |
| `@vielzeug/sigil/headless`             | Headless primitive controllers for custom component authoring          |
| `@vielzeug/sigil/testing`              | Test utilities: ARIA helpers, DOM queries, mount wrappers, event utils |
| `@vielzeug/sigil/styles`               | Global tokens and shared component styles                              |
| `@vielzeug/sigil/styles/styles.css`    | Explicit base stylesheet path                                          |
| `@vielzeug/sigil/styles/theme.css`     | Theme token stylesheet                                                 |
| `@vielzeug/sigil/styles/animation.css` | Animation helpers                                                      |
| `@vielzeug/sigil/styles/layers.css`    | Cascade layer definitions                                              |
| `@vielzeug/sigil/styles/preflight.css` | CSS reset / preflight (importable separately to opt out)               |

Headless controller primitives (`createTextField`, `createChoiceField`, `createCheckable`, `createListControl`, `createOverlayControl`, and others) are also available via the dedicated `@vielzeug/sigil/headless` subpath. Use `lifecycleSignal(onCleanup)` to wire an `AbortSignal` from a Craft component's `onCleanup` callback into any headless primitive that accepts a `signal` option.

The `@vielzeug/sigil/testing` subpath provides utilities for component tests: ARIA helpers (`isAriaInvalid`, `getAriaState`, …), DOM query helpers (`queryInShadow`, `queryAllInShadow`), typed mount wrappers (`mountSgInput`, `mountSgSelect`, …), serialization helpers (`propsToAttrs`, `attrsToHtml`), and event helpers (`keyEvent`, `nextTick`, `wait`).

## Runtime Registration Imports

Use side-effect imports to register only the elements you need:

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

## Root Export Surface

The package root is a **flat named-export surface**. It re-exports symbols from the internal content/disclosure/feedback/inputs/layout/overlay/type modules while also registering all published components as a side effect.

Notable root exports include:

- tag constants like `BUTTON_TAG`, `INPUT_TAG`, `DIALOG_TAG`
- context constants like `FORM_CTX`, `TABS_CTX`, `CHECKBOX_GROUP_CTX`
- component prop/event types like `SgButtonProps`, `SgInputEvents`
- toast runtime API: `toast`

## Component Documentation Index

Use the following pages as the canonical per-component API source.

### Disclosure

- [Accordion](./components/accordion.md)
- [Tabs](./components/tabs.md)

### Feedback

- [Alert](./components/alert.md)
- [Async (sg-async)](./components/async.md)
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

## Types

Every component exports TypeScript types named after the component. Import them from the component's subpath:

```ts
import type { SgButtonProps, SgButtonEvents } from '@vielzeug/sigil/button';
import type { SgInputProps, SgInputEvents } from '@vielzeug/sigil/input';
import type { SgDialogProps, SgDialogEvents } from '@vielzeug/sigil/dialog';
```

Shared types used across multiple components:

| Type                | Package path              | Description                                                                          |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `ThemeColor`        | `@vielzeug/sigil/types`   | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`           |
| `VisualVariant`     | `@vielzeug/sigil/types`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'`       |
| `SurfaceVariant`    | `@vielzeug/sigil/types`   | `VisualVariant \| 'glass'` — use for container components that support glass effect  |
| `ComponentSize`     | `@vielzeug/sigil/types`   | `'sm' \| 'md' \| 'lg'`                                                               |
| `RoundedSize`       | `@vielzeug/sigil/types`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`               |
| `PaddingSize`       | `@vielzeug/sigil/types`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                            |
| `AddEventListeners` | `@vielzeug/sigil/types`   | Mixin type that adds typed `addEventListener` / `removeEventListener` overloads      |

## Notes

- Prefer subpath imports for runtime registration to keep bundles small and registration explicit.
- Import `@vielzeug/sigil/styles` before component registration.
- Importing `@vielzeug/sigil` registers every published component; use it when convenience matters more than granular control.
- For attribute/event/CSS variable details, use each component page in this section.
- For WCAG compliance details and the axe-core testing contract, see the **[Accessibility Quality Bar](./accessibility.md)**.

## Headless API

Import headless primitives from `@vielzeug/sigil/headless` or from `@vielzeug/sigil` directly.

```ts
import { lifecycleSignal, createTextField, createChoiceField, createCheckable } from '@vielzeug/sigil/headless';
```

All stateful primitives accept a required `signal: AbortSignal` option. Use `lifecycleSignal(onCleanup)` inside a Craft `setup()` function to produce this signal.

### `lifecycleSignal(onCleanup)`

```ts
lifecycleSignal(onCleanup: (fn: () => void) => void): AbortSignal
```

Creates an `AbortSignal` that is aborted when the Craft component disconnects. Pass the signal as the `signal` option to any stateful headless primitive.

### `createTextField(options)`

```ts
createTextField(options: TextFieldOptions): TextFieldHandle
```

Headless controller for `<input>` and `<textarea>` elements. Manages value sync, validation triggers, character counter, and event wiring.

**Key handle members:** `value` (writable signal), `wire(el, signal?)` (attaches listeners), `clear()`, `counter` (nullable reactive counter state), ARIA signals from `FieldHandle`.

### `createChoiceField(options)`

```ts
createChoiceField(options: ChoiceFieldOptions): ChoiceFieldHandle
```

Headless controller for single and multi-select inputs. Normalises `string | string[]` values. Disposes internal watchers on signal abort.

**Key handle members:** `selectedValues`, `selectedValue`, `selectValue()`, `toggleValue()`, `removeValue()`, `clear()`, `setValues()`, `formValue`.

### `createCheckable(options)`

```ts
createCheckable(options: CheckableOptions): CheckableHandle
```

Headless controller for checkboxes and radios. Handles checked/indeterminate state, group delegation, and keyboard activation.

**Key handle members:** `checked`, `indeterminate`, `toggle()`, `handleClick()`, `handleKeydown()`, `checkableFormValue`.

### `createOverlayControl(options)`

```ts
createOverlayControl(options: OverlayControlOptions): OverlayControl
```

Headless open/close/toggle controller for dialogs, drawers, menus, and popovers. Handles outside-click detection, focus restoration, and positioner lifecycle.

`cleanup()` closes silently — it does not fire `onClose`. Useful for component teardown. Automatically called on signal abort.

**Methods:** `open(reason?)`, `close(reason?, restoreFocus?)`, `toggle(openReason?, closeReason?)`, `cleanup()`, `dispose()`, `[Symbol.dispose]()`.

> `dispose()` and `[Symbol.dispose]()` are aliases for `cleanup()` — use them for `using` declarations or resource-management patterns.

### `createOptionList(options)`

```ts
createOptionList<T extends BaseOptionItem>(options: OptionListOptions<T>): OptionListHandle<T>
```

Composed headless primitive for dropdown option lists (select, combobox, menu). Owns `isOpen`, `focusedIndex`, the dropdown positioner, list navigation, and overlay wiring.

**Required DOM accessors:** `dom.getBoundary`, `dom.getPanel`, `dom.getReference`.

**Key handle members:** `isOpen`, `focusedIndex`, `ariaExpanded`, `ariaActiveDescendant`, `open()`, `close()`, `toggle()`, `first()`, `last()`, `next()`, `prev()`, `set()`, `reset()`, `handleKeydown()`, `scrollFocusedIntoView()`, `positioner`.

### `createListControl(options)`

```ts
createListControl<T>(options: ListNavigationOptions<T>): ListControl<T>
```

Keyboard-navigable list controller without open state. Supports vertical/horizontal/omni navigation, disabled-item skipping, looping, and typeahead.

`cleanup()` resets the typeahead timer — call it when disposing the host. `set(-1)` clears focus (equivalent to `reset()`).

**Navigation methods** return the resolved index (`number`), or `-1` when no enabled item was found.

### `keymap()` / `keymapPresets`

```ts
keymap(preset: 'vertical' | 'horizontal' | 'omni', overrides?: Keymap): Record<ListNavigationAction, string[]>
```

Compose a custom keymap from a preset plus per-action overrides. Pass the result as `keys` in `ListNavigationOptions`.

### Other headless exports

| Export | Description |
| --- | --- |
| `createField()` | Base field: IDs, ARIA signals, label state, validation trigger |
| `createSpinnerControl()` | Number spinner step/clamp/keyboard logic (for `sg-number-input`) |
| `createSliderControl()` | Range slider value/step/clamp/keyboard (for `sg-slider`) |
| `createSwipeControl()` | Touch/pointer swipe gesture detection (carousel, drawer, toast dismiss) |
| `createPaginatedList()` | Reactive page-index + page-items controller |
| `createFocusTrap()` | Focus trap for modal dialogs |
| `createFocusManager()` | Three-step focus lifecycle: capture → move → restore |
| `createDatePickerControl()` | Full date-picker state (calendar, view switching, ISO parsing) |
| `createDataGridControl()` | Data grid state (sorting, selection, column management). Note: `renderExpanded` uses `innerHTML` — sanitize untrusted data before returning |
| `createTypeahead()` | Standalone typeahead search buffer with debounced reset |
| `createDropdownPositioner()` | Floating dropdown positioner (wraps `orbit`) |
| `createDialogFocusControl()` | Dialog-specific focus entry and restoration |
| `createInteraction()` | Unified click/keyboard press handler for accessible interactive elements |
| `dispatchKeyboardAction()` | Low-level keymap dispatcher — returns `true` when a key matched and was handled |
| `announce()` | ARIA live-region announcer (polite or assertive, WeakMap-isolated) |
| `syncedSignal()` | Local writable signal synced from a `ReadonlySignal` source |
| `parseStringTriggers()` | Parse comma-separated trigger strings against an allowed set |
| `getChoiceLabel()` | Read the display label from a `<sg-option>` or similar element |
| `getLightChildrenByTag()` | Collect light-DOM children matching a tag name |
| `toFiniteNumber()` | Parse a value to a finite number, returning `undefined` for non-finite |
| `toFiniteNumberOr()` | Parse a value to a finite number with a fallback default |
| `toPositiveStep()` | Coerce a step value to a positive finite number with a fallback |
