---
title: Sigil — API Reference
description: Entry points, import paths, and exported symbols for @vielzeug/sigil.
---

[[toc]]

## API At a Glance

| Symbol                    | Purpose                                                              | Execution mode | Common gotcha                                                               |
| ------------------------- | -------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| `Custom element subpaths` | Register only the components you use                                 | Sync           | Import component styles before rendering UI                                 |
| `@vielzeug/sigil/styles`  | Load shared design tokens and base styles                            | Sync           | Missing base styles causes inconsistent spacing and colors                  |
| `Component exports`       | Consume component types and shared symbols                           | Sync           | Prefer documented subpaths over deep internal imports                       |
| `componentSignal()`       | Bridge `onCleanup` to an `AbortSignal` for headless primitive wiring | Sync           | Pass directly as `signal:` option; never store the result across re-renders |

## Package Entry Points

| Import                                 | Purpose                                                                |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `@vielzeug/sigil`                      | Registers all published components and re-exports shared symbols/types |
| `@vielzeug/sigil/types`                | Shared TypeScript types                                                |
| `@vielzeug/sigil/styles`               | Global tokens and shared component styles                              |
| `@vielzeug/sigil/styles/styles.css`    | Explicit base stylesheet path                                          |
| `@vielzeug/sigil/styles/theme.css`     | Theme token stylesheet                                                 |
| `@vielzeug/sigil/styles/animation.css` | Animation helpers                                                      |
| `@vielzeug/sigil/styles/layers.css`    | Cascade layer definitions                                              |

Headless controller primitives (`createTextField`, `createChoiceField`, `createCheckable`, `createListControl`, `createOverlayControl`, and others) are exported from `@vielzeug/sigil` alongside the component types — no separate subpath is needed. Use `componentSignal(onCleanup)` to wire an `AbortSignal` from a craft component's `onCleanup` callback into any headless primitive that accepts a `signal` option.

The `@vielzeug/sigil/testing` subpath provides utilities for component tests: ARIA helpers (`isAriaInvalid`, `getAriaState`, …), DOM query helpers (`queryInShadow`, `queryAllInShadow`), typed mount wrappers (`mountBitInput`, `mountBitSelect`, …), serialization helpers (`propsToAttrs`, `attrsToHtml`), and event helpers (`keyEvent`, `nextTick`, `wait`).

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
import '@vielzeug/sigil/badge';
import '@vielzeug/sigil/box';
import '@vielzeug/sigil/breadcrumb';
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/button-group';
import '@vielzeug/sigil/card';
import '@vielzeug/sigil/checkbox';
import '@vielzeug/sigil/checkbox-group';
import '@vielzeug/sigil/chip';
import '@vielzeug/sigil/combobox';
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
import '@vielzeug/sigil/toast';
import '@vielzeug/sigil/tooltip';
```

## Root Export Surface

The package root is a **flat named-export surface**. It re-exports symbols from the internal content/disclosure/feedback/inputs/layout/overlay/type modules while also registering all published components as a side effect.

Notable root exports include:

- tag constants like `BUTTON_TAG`, `INPUT_TAG`, `DIALOG_TAG`
- context constants like `FORM_CTX`, `TABS_CTX`, `CHECKBOX_GROUP_CTX`
- component prop/event types like `BitButtonProps`, `BitInputEvents`
- toast runtime API: `toast`

## Component Documentation Index

Use the following pages as the canonical per-component API source.

### Disclosure

- [Accordion](./components/accordion.md)
- [Tabs](./components/tabs.md)

### Feedback

- [Alert](./components/alert.md)
- [Async (bit-async)](./components/async.md)
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
- [Checkbox (+ Checkbox Group)](./components/checkbox.md)
- [Checkbox Group](./components/checkbox-group.md)
- [Combobox](./components/combobox.md)
- [File Input](./components/file-input.md)
- [Form](./components/form.md)
- [Input](./components/input.md)
- [Number Input](./components/number-input.md)
- [OTP Input](./components/otp-input.md)
- [Radio (+ Radio Group)](./components/radio.md)
- [Radio Group](./components/radio-group.md)
- [Rating](./components/rating.md)
- [Select](./components/select.md)
- [Slider](./components/slider.md)
- [Switch](./components/switch.md)
- [Textarea](./components/textarea.md)

### Layout

- [Box](./components/box.md)
- [Grid (+ Grid Item)](./components/grid.md)
- [Navbar](./components/navbar.md)
- [Sidebar](./components/sidebar.md)

## Notes

- Prefer subpath imports for runtime registration to keep bundles small and registration explicit.
- Import `@vielzeug/sigil/styles` before component registration.
- Importing `@vielzeug/sigil` registers every published component; use it when convenience matters more than granular control.
- For attribute/event/CSS variable details, use each component page in this section.
- For WCAG compliance details and the axe-core testing contract, see the **[Accessibility Quality Bar](./accessibility.md)**.

## Headless API Changes

### `TextFieldOptions` — `lifecycle` renamed to `signal`

`TextFieldOptions.lifecycle` has been renamed to `signal` for consistency with all other headless primitives (`createCheckable`, `createOverlayControl`, `createOptionList`). Update any existing usages:

```ts
// Before
createTextField({ lifecycle: abortSignal, ... });

// After
createTextField({ signal: abortSignal, ... });
```

### `ListControl` — `cleanup()` added

`createListControl` now returns a `cleanup()` method that immediately resets the typeahead search buffer. Call it when disposing the list to prevent stale timer callbacks from firing after teardown. `createOptionList` calls this automatically.

### `createOverlayControl` — `cleanup()` no longer fires `onClose`

Previously, calling `cleanup()` on an open overlay would invoke the `onClose` callback. It now closes silently. This prevents state mutations on unmounted components.

### `createChoiceField` — `signal` and `cleanup()` added

`ChoiceFieldOptions` now accepts an optional `signal?: AbortSignal` to auto-dispose internal `watch()` subscriptions on component unmount. A `cleanup()` method is also exposed on `ChoiceFieldHandle` for manual teardown. All component consumers (`bit-select`, `bit-combobox`, `bit-checkbox-group`, `bit-radio-group`) now pass their `componentSignal` automatically.

```ts
// Before — subscriptions leaked on unmount
const choice = createChoiceField({ value, ... });

// After — auto-disposed
const choice = createChoiceField({ signal: componentSignal(onCleanup), value, ... });
```

### `createListControl` — `set(-1)` now clears focus

Previously `set(-1)` was silently clamped to `set(0)`. It now behaves like `reset()`, setting the index to `-1` (no focused item) and returning `-1`. This is a bug-fix breaking change.

### `OptionListHandle` — navigation methods now return `number`

`first()`, `last()`, `next()`, `prev()`, and `set()` on `OptionListHandle` now return the resolved index (`number`) instead of `void`. Callers can use the return value directly instead of reading `focusedIndex.value` as a follow-up step.
