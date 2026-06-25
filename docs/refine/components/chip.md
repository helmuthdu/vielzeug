# Chip

A compact, styled label for tags, filters, and selected values. Supports a leading icon, interaction modes (static, removable, selectable), all color themes, five variants, and three sizes. Used internally by `ore-select` and `ore-combobox` in multiselect mode.

## Variants

Five visual variants for different levels of emphasis.

<ComponentPreview center>

```html
<ore-chip color="primary" variant="solid">Solid</ore-chip>
<ore-chip color="primary" variant="flat">Flat</ore-chip>
<ore-chip color="primary" variant="bordered">Bordered</ore-chip>
<ore-chip color="primary" variant="outline">Outline</ore-chip>
<ore-chip color="primary" variant="ghost">Ghost</ore-chip>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<ore-chip variant="flat">Default</ore-chip>
<ore-chip variant="flat" color="primary">Primary</ore-chip>
<ore-chip variant="flat" color="secondary">Secondary</ore-chip>
<ore-chip variant="flat" color="info">Info</ore-chip>
<ore-chip variant="flat" color="success">Success</ore-chip>
<ore-chip variant="flat" color="warning">Warning</ore-chip>
<ore-chip variant="flat" color="error">Error</ore-chip>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-chip color="primary" size="sm">Small</ore-chip>
<ore-chip color="primary" size="md">Medium</ore-chip>
<ore-chip color="primary" size="lg">Large</ore-chip>
```

</ComponentPreview>

## Removable

Set `mode="removable"` to show a × button. Listen for `remove` to handle removal. The `value` attribute is included in the event detail.

<ComponentPreview center>

```html
<ore-chip color="primary" variant="flat" mode="removable" value="ts">TypeScript</ore-chip>
<ore-chip color="success" variant="flat" mode="removable" value="go">Go</ore-chip>
<ore-chip color="warning" variant="flat" mode="removable" value="rust">Rust</ore-chip>
```

</ComponentPreview>

```js
document.querySelectorAll('ore-chip').forEach((chip) => {
  chip.addEventListener('remove', (e) => {
    console.log('removed:', e.detail.value, 'source event:', e.detail.originalEvent?.type);
    e.target.remove();
  });
});
```

## Selectable

Set `mode="selectable"` to make the chip behave like a checkbox-like toggle. Use `change` to react to state updates.

<ComponentPreview center>

```html
<ore-chip mode="selectable" value="design">Design</ore-chip>
<ore-chip mode="selectable" default-checked value="ux">UX</ore-chip>
```

</ComponentPreview>

```js
document.querySelectorAll('ore-chip[mode="selectable"]').forEach((chip) => {
  chip.addEventListener('change', (e) => {
    console.log('checked:', e.detail.checked, 'value:', e.detail.value, 'source:', e.detail.originalEvent?.type);
  });
});
```

## Action

Set `mode="action"` to make the chip behave like a button — it fires a `click` event but holds no internal state. Use it for quick actions, command triggers, or suggestion pills. Supply `aria-label` for icon-only action chips.

<ComponentPreview center>

```html
<ore-chip mode="action" value="add">Add Tag</ore-chip>
<ore-chip mode="action" color="primary" variant="flat" value="star">
  <ore-icon slot="icon" name="star" size="12"></ore-icon>
  Favourite
</ore-chip>
<ore-chip mode="action" color="error" variant="ghost" value="delete" aria-label="Delete item">
  <ore-icon slot="icon" name="trash-2" size="12"></ore-icon>
  Remove
</ore-chip>
```

</ComponentPreview>

```js
document.querySelectorAll('ore-chip[mode="action"]').forEach((chip) => {
  chip.addEventListener('click', (e) => {
    console.log('action:', e.detail.value, 'source:', e.detail.originalEvent?.type);
  });
});
```

## With Icon

Use the `icon` named slot to prepend a leading icon or glyph.

<ComponentPreview center>

```html
<ore-chip color="success" variant="flat">
  <ore-icon slot="icon" name="check" size="12"></ore-icon>
  Verified
</ore-chip>
<ore-chip color="primary" variant="bordered">
  <ore-icon slot="icon" name="clock" size="12"></ore-icon>
  Pending
</ore-chip>
```

</ComponentPreview>

## Rounded

Override the border radius with the `rounded` attribute.

<ComponentPreview center>

```html
<ore-chip variant="bordered" color="primary" rounded="none">None</ore-chip>
<ore-chip variant="bordered" color="primary" rounded="sm">Small</ore-chip>
<ore-chip variant="bordered" color="primary" rounded="md">Medium</ore-chip>
<ore-chip variant="bordered" color="primary" rounded="lg">Large</ore-chip>
<ore-chip variant="bordered" color="primary" rounded="full">Full</ore-chip>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<ore-chip color="primary" variant="flat" disabled mode="removable">Disabled chip</ore-chip>
```

</ComponentPreview>

## Building a Tag Input

Chips are designed to compose with form controls. Here is a minimal tag-input pattern built on top of `ore-chip`:

<ComponentPreview vertical>

```html
<div id="tag-wrap" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
  <ore-chip color="primary" variant="flat" mode="removable" value="design">Design</ore-chip>
  <ore-chip color="primary" variant="flat" mode="removable" value="ux">UX</ore-chip>
  <ore-chip color="primary" variant="flat" mode="removable" value="a11y">Accessibility</ore-chip>
</div>
```

</ComponentPreview>

```js
document.getElementById('tag-wrap').addEventListener('remove', (e) => {
  e.target.remove();
  console.log('tag removed:', e.detail.value);
});
```

## API Reference

### Attributes

| Attribute         | Type                                                                      | Default    | Description                                                      |
| ----------------- | ------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| `aria-label`      | `string`                                                                  | —          | Accessible label for icon-only chips and custom action text      |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —          | Color theme                                                      |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'`                 | `'solid'`  | Visual style variant                                             |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`     | Chip size                                                        |
| `rounded`         | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | —          | Border radius override                                           |
| `mode`            | `'static' \| 'removable' \| 'selectable' \| 'action'`                     | `'static'` | Interaction mode                                                 |
| `disabled`        | `boolean`                                                                 | `false`    | Disable the chip (remove button becomes non-functional)          |
| `value`           | `string`                                                                  | —          | Value passed in the `remove`, `change`, and `click` event detail |
| `checked`         | `boolean`                                                                 | —          | Controlled checked state for selectable chips                    |
| `default-checked` | `boolean`                                                                 | `false`    | Initial checked state in uncontrolled selectable mode            |

### Slots

| Slot      | Description                |
| --------- | -------------------------- |
| (default) | Chip label text            |
| `icon`    | Leading icon or decoration |

### Events

| Event    | Detail                                                                        | Description                             |
| -------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| `remove` | `{ value: string \| undefined, originalEvent: MouseEvent }`                   | Fired when the remove button is clicked |
| `change` | `{ value: string \| undefined, checked: boolean, originalEvent: MouseEvent }` | Fired when a selectable chip toggles    |
| `click`  | `{ value: string \| undefined, originalEvent: MouseEvent }`                   | Fired when an action chip is clicked    |

### CSS Custom Properties

| Property                    | Description                                 | Default               |
| --------------------------- | ------------------------------------------- | --------------------- |
| `--chip-bg`                 | Background color                            | Variant-dependent     |
| `--chip-color`              | Text color                                  | Variant-dependent     |
| `--chip-border-color`       | Border color                                | Variant-dependent     |
| `--chip-radius`             | Border radius                               | `var(--rounded-full)` |
| `--chip-font-size`          | Font size                                   | `var(--text-sm)`      |
| `--chip-font-weight`        | Font weight                                 | `var(--font-medium)`  |
| `--chip-padding-x`          | Horizontal padding                          | `var(--size-2-5)`     |
| `--chip-padding-y`          | Vertical padding                            | `var(--size-0-5)`     |
| `--chip-gap`                | Gap between icon, label, and remove button  | `var(--size-1)`       |
| `--chip-hover-bg`           | Background on hover (interactive modes)     | Variant-dependent     |
| `--chip-hover-color`        | Text color on hover (interactive modes)     | Variant-dependent     |
| `--chip-hover-border-color` | Border color on hover (interactive modes)   | Variant-dependent     |
| `--chip-active-bg`          | Background when pressed (interactive modes) | Variant-dependent     |
| `--chip-active-color`       | Text color when pressed (interactive modes) | Variant-dependent     |
| `--chip-remove-bg`          | Remove button background (bordered/outline) | Variant-dependent     |
| `--chip-remove-color`       | Remove button icon color (bordered/outline) | Variant-dependent     |
| `--chip-remove-hover-bg`    | Remove button background on hover           | Variant-dependent     |

## Accessibility

The chip component follows WAI-ARIA best practices. The remove button is keyboard-accessible and carries a contextual `aria-label`: `"Remove {value}"` when `value` is set, or `"Remove"` otherwise. When `disabled`, the remove button has the `disabled` attribute preventing activation.

Selectable chips use `role="checkbox"` and `aria-checked` while preserving the visible label as the accessible name. Action chips render as a `<button>` element; supply `aria-label` for icon-only action chips. Use `value` to identify which chip triggered an event in a list.
