---
title: Buildit — API Reference
description: Entry points, import paths, and exported symbols for @vielzeug/buildit.
---

[[toc]]

## API At a Glance

| Symbol                     | Purpose                                    | Execution mode | Common gotcha                                              |
| -------------------------- | ------------------------------------------ | -------------- | ---------------------------------------------------------- |
| `Custom element subpaths`  | Register only the components you use       | Sync           | Import component styles before rendering UI                |
| `@vielzeug/buildit/styles` | Load shared design tokens and base styles  | Sync           | Missing base styles causes inconsistent spacing and colors |
| `Component exports`        | Consume component types and shared symbols | Sync           | Prefer documented subpaths over deep internal imports      |

## Package Entry Points

| Import                                    | Purpose                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `@vielzeug/buildit`                       | Registers all published components and re-exports shared symbols/types |
| `@vielzeug/buildit/types`                 | Shared TypeScript types                                                |
| `@vielzeug/buildit/styles`                | Global tokens and shared component styles                              |
| `@vielzeug/buildit/styles/styles.css`     | Explicit base stylesheet path                                          |
| `@vielzeug/buildit/styles/theme.css`      | Theme token stylesheet                                                 |
| `@vielzeug/buildit/styles/animation.css`  | Animation helpers                                                      |
| `@vielzeug/buildit/styles/layers.css`     | Cascade layer definitions                                              |

For headless controller primitives (`createTextFieldControl`, `createChoiceFieldControl`, `createCheckableFieldControl`, `createListControl`, `createOverlayControl`), use `@vielzeug/craftit/controls`.

## Runtime Registration Imports

Use side-effect imports to register only the elements you need:

```ts
import '@vielzeug/buildit/styles';
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';
import '@vielzeug/buildit/dialog';
```

Or register everything:

```ts
import '@vielzeug/buildit/styles';
import '@vielzeug/buildit';
```

## Published Component Subpaths

```ts
import '@vielzeug/buildit/accordion';
import '@vielzeug/buildit/accordion-item';
import '@vielzeug/buildit/alert';
import '@vielzeug/buildit/async';
import '@vielzeug/buildit/avatar';
import '@vielzeug/buildit/badge';
import '@vielzeug/buildit/box';
import '@vielzeug/buildit/breadcrumb';
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/button-group';
import '@vielzeug/buildit/card';
import '@vielzeug/buildit/checkbox';
import '@vielzeug/buildit/checkbox-group';
import '@vielzeug/buildit/chip';
import '@vielzeug/buildit/combobox';
import '@vielzeug/buildit/dialog';
import '@vielzeug/buildit/drawer';
import '@vielzeug/buildit/file-input';
import '@vielzeug/buildit/form';
import '@vielzeug/buildit/grid';
import '@vielzeug/buildit/grid-item';
import '@vielzeug/buildit/icon';
import '@vielzeug/buildit/input';
import '@vielzeug/buildit/menu';
import '@vielzeug/buildit/number-input';
import '@vielzeug/buildit/otp-input';
import '@vielzeug/buildit/pagination';
import '@vielzeug/buildit/popover';
import '@vielzeug/buildit/progress';
import '@vielzeug/buildit/radio';
import '@vielzeug/buildit/radio-group';
import '@vielzeug/buildit/rating';
import '@vielzeug/buildit/select';
import '@vielzeug/buildit/separator';
import '@vielzeug/buildit/sidebar';
import '@vielzeug/buildit/skeleton';
import '@vielzeug/buildit/slider';
import '@vielzeug/buildit/switch';
import '@vielzeug/buildit/tab-item';
import '@vielzeug/buildit/tab-panel';
import '@vielzeug/buildit/table';
import '@vielzeug/buildit/tabs';
import '@vielzeug/buildit/text';
import '@vielzeug/buildit/textarea';
import '@vielzeug/buildit/toast';
import '@vielzeug/buildit/tooltip';
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
- [Sidebar](./components/sidebar.md)

## Notes

- Prefer subpath imports for runtime registration to keep bundles small and registration explicit.
- Import `@vielzeug/buildit/styles` before component registration.
- Importing `@vielzeug/buildit` registers every published component; use it when convenience matters more than granular control.
- For attribute/event/CSS variable details, use each component page in this section.
- For WCAG compliance details and the axe-core testing contract, see the **[Accessibility Quality Bar](./accessibility.md)**.
