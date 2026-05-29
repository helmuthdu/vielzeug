---
title: Block — API Reference
description: Entry points, import paths, and exported symbols for @vielzeug/block.
---

[[toc]]

## API At a Glance

| Symbol                     | Purpose                                    | Execution mode | Common gotcha                                              |
| -------------------------- | ------------------------------------------ | -------------- | ---------------------------------------------------------- |
| `Custom element subpaths`  | Register only the components you use       | Sync           | Import component styles before rendering UI                |
| `@vielzeug/block/styles` | Load shared design tokens and base styles  | Sync           | Missing base styles causes inconsistent spacing and colors |
| `Component exports`        | Consume component types and shared symbols | Sync           | Prefer documented subpaths over deep internal imports      |

## Package Entry Points

| Import                                   | Purpose                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `@vielzeug/block`                      | Registers all published components and re-exports shared symbols/types |
| `@vielzeug/block/types`                | Shared TypeScript types                                                |
| `@vielzeug/block/styles`               | Global tokens and shared component styles                              |
| `@vielzeug/block/styles/styles.css`    | Explicit base stylesheet path                                          |
| `@vielzeug/block/styles/theme.css`     | Theme token stylesheet                                                 |
| `@vielzeug/block/styles/animation.css` | Animation helpers                                                      |
| `@vielzeug/block/styles/layers.css`    | Cascade layer definitions                                              |

For headless controller primitives (`createTextField`, `createChoiceField`, `createCheckableFieldControl`, `createListControl`, `createOverlayControl`), use `@vielzeug/craft/controls`.

## Runtime Registration Imports

Use side-effect imports to register only the elements you need:

```ts
import '@vielzeug/block/styles';
import '@vielzeug/block/button';
import '@vielzeug/block/input';
import '@vielzeug/block/dialog';
```

Or register everything:

```ts
import '@vielzeug/block/styles';
import '@vielzeug/block';
```

## Published Component Subpaths

```ts
import '@vielzeug/block/accordion';
import '@vielzeug/block/accordion-item';
import '@vielzeug/block/alert';
import '@vielzeug/block/async';
import '@vielzeug/block/avatar';
import '@vielzeug/block/badge';
import '@vielzeug/block/box';
import '@vielzeug/block/breadcrumb';
import '@vielzeug/block/button';
import '@vielzeug/block/button-group';
import '@vielzeug/block/card';
import '@vielzeug/block/checkbox';
import '@vielzeug/block/checkbox-group';
import '@vielzeug/block/chip';
import '@vielzeug/block/combobox';
import '@vielzeug/block/dialog';
import '@vielzeug/block/drawer';
import '@vielzeug/block/file-input';
import '@vielzeug/block/form';
import '@vielzeug/block/grid';
import '@vielzeug/block/grid-item';
import '@vielzeug/block/icon';
import '@vielzeug/block/input';
import '@vielzeug/block/menu';
import '@vielzeug/block/navbar';
import '@vielzeug/block/number-input';
import '@vielzeug/block/otp-input';
import '@vielzeug/block/pagination';
import '@vielzeug/block/password-strength';
import '@vielzeug/block/popover';
import '@vielzeug/block/progress';
import '@vielzeug/block/radio';
import '@vielzeug/block/radio-group';
import '@vielzeug/block/rating';
import '@vielzeug/block/select';
import '@vielzeug/block/separator';
import '@vielzeug/block/sidebar';
import '@vielzeug/block/skeleton';
import '@vielzeug/block/slider';
import '@vielzeug/block/switch';
import '@vielzeug/block/tab-item';
import '@vielzeug/block/tab-panel';
import '@vielzeug/block/table';
import '@vielzeug/block/tabs';
import '@vielzeug/block/text';
import '@vielzeug/block/textarea';
import '@vielzeug/block/toast';
import '@vielzeug/block/tooltip';
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
- Import `@vielzeug/block/styles` before component registration.
- Importing `@vielzeug/block` registers every published component; use it when convenience matters more than granular control.
- For attribute/event/CSS variable details, use each component page in this section.
- For WCAG compliance details and the axe-core testing contract, see the **[Accessibility Quality Bar](./accessibility.md)**.
