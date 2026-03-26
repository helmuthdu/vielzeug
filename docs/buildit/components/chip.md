# Chip

A compact, styled label for tags, filters, and selected values. Supports a leading icon, interaction modes (static, removable, selectable), all color themes, five variants, and three sizes. Used internally by `bit-select` and `bit-combobox` in multiselect mode.

## Features

- 🎨 **5 Variants**: solid, flat, bordered, outline, ghost
- 🌈 **6 Semantic Colors**: primary, secondary, info, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ❌ **Removable**: optional × button that fires `remove`
- ✅ **Selectable**: toggle chip state with `mode="selectable"` and the `change` event
- ⚡ **Action**: stateless button-like chip that fires a `click` event
- 🖼️ **Icon Slot**: prepend an icon or decoration
- ♿ **Accessible**: remove button has a contextual `aria-label` including the chip value

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/feedback/chip/chip.ts
:::

## Basic Usage

<ComponentPreview center>

```html
<bit-chip>Design</bit-chip>
<bit-chip color="primary">TypeScript</bit-chip>
<bit-chip color="success">Approved</bit-chip>
<bit-chip color="warning">Pending</bit-chip>
<bit-chip color="error">Rejected</bit-chip>
```

</ComponentPreview>

## Variants

Five visual variants for different levels of emphasis.

<ComponentPreview center>

```html
<bit-chip color="primary" variant="solid">Solid</bit-chip>
<bit-chip color="primary" variant="flat">Flat</bit-chip>
<bit-chip color="primary" variant="bordered">Bordered</bit-chip>
<bit-chip color="primary" variant="outline">Outline</bit-chip>
<bit-chip color="primary" variant="ghost">Ghost</bit-chip>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<bit-chip variant="flat">Default</bit-chip>
<bit-chip variant="flat" color="primary">Primary</bit-chip>
<bit-chip variant="flat" color="secondary">Secondary</bit-chip>
<bit-chip variant="flat" color="info">Info</bit-chip>
<bit-chip variant="flat" color="success">Success</bit-chip>
<bit-chip variant="flat" color="warning">Warning</bit-chip>
<bit-chip variant="flat" color="error">Error</bit-chip>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<bit-chip color="primary" size="sm">Small</bit-chip>
<bit-chip color="primary" size="md">Medium</bit-chip>
<bit-chip color="primary" size="lg">Large</bit-chip>
```

</ComponentPreview>

## Removable

Set `mode="removable"` to show a × button. Listen for `remove` to handle removal. The `value` attribute is included in the event detail.

<ComponentPreview center>

```html
<bit-chip color="primary" variant="flat" mode="removable" value="ts">TypeScript</bit-chip>
<bit-chip color="success" variant="flat" mode="removable" value="go">Go</bit-chip>
<bit-chip color="warning" variant="flat" mode="removable" value="rust">Rust</bit-chip>
```

</ComponentPreview>

```js
document.querySelectorAll('bit-chip').forEach((chip) => {
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
<bit-chip mode="selectable" value="design">Design</bit-chip>
<bit-chip mode="selectable" default-checked value="ux">UX</bit-chip>
```

</ComponentPreview>

```js
document.querySelectorAll('bit-chip[mode="selectable"]').forEach((chip) => {
  chip.addEventListener('change', (e) => {
    console.log('checked:', e.detail.checked, 'value:', e.detail.value, 'source:', e.detail.originalEvent?.type);
  });
});
```

## Action

Set `mode="action"` to make the chip behave like a button — it fires a `click` event but holds no internal state. Use it for quick actions, command triggers, or suggestion pills.

<ComponentPreview center>

```html
<bit-chip mode="action" value="add">Add Tag</bit-chip>
<bit-chip mode="action" color="primary" variant="flat" value="star">
  <bit-icon slot="icon" name="star" size="12"></bit-icon>
  Favourite
</bit-chip>
<bit-chip mode="action" color="error" variant="ghost" value="delete" aria-label="Delete item">
  <bit-icon slot="icon" name="trash-2" size="12"></bit-icon>
  Remove
</bit-chip>

<script type="module">
  import '@vielzeug/buildit/chip';
  import '@vielzeug/buildit/icon';
</script>
```

</ComponentPreview>

```js
document.querySelectorAll('bit-chip[mode="action"]').forEach((chip) => {
  chip.addEventListener('click', (e) => {
    console.log('action:', e.detail.value, 'source:', e.detail.originalEvent?.type);
  });
});
```

## With Icon

Use the `icon` named slot to prepend a leading icon or glyph.

<ComponentPreview center>

```html
<bit-chip color="success" variant="flat">
  <bit-icon slot="icon" name="check" size="12"></bit-icon>
  Verified
</bit-chip>
<bit-chip color="primary" variant="bordered">
  <bit-icon slot="icon" name="clock" size="12"></bit-icon>
  Pending
</bit-chip>

<script type="module">
  import '@vielzeug/buildit/chip';
  import '@vielzeug/buildit/icon';
</script>
```

</ComponentPreview>

## Rounded

Override the border radius with the `rounded` attribute.

<ComponentPreview center>

```html
<bit-chip variant="bordered" color="primary" rounded="none">None</bit-chip>
<bit-chip variant="bordered" color="primary" rounded="sm">Small</bit-chip>
<bit-chip variant="bordered" color="primary" rounded="md">Medium</bit-chip>
<bit-chip variant="bordered" color="primary" rounded="lg">Large</bit-chip>
<bit-chip variant="bordered" color="primary" rounded="full">Full</bit-chip>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<bit-chip color="primary" variant="flat" disabled mode="removable">Disabled chip</bit-chip>
```

</ComponentPreview>

## Building a Tag Input

Chips are designed to compose with form controls. Here is a minimal tag-input pattern built on top of `bit-chip`:

<ComponentPreview vertical>

```html
<div id="tag-wrap" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
  <bit-chip color="primary" variant="flat" mode="removable" value="design">Design</bit-chip>
  <bit-chip color="primary" variant="flat" mode="removable" value="ux">UX</bit-chip>
  <bit-chip color="primary" variant="flat" mode="removable" value="a11y">Accessibility</bit-chip>
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

| Property              | Description                                | Default           |
| --------------------- | ------------------------------------------ | ----------------- |
| `--chip-bg`           | Background color                           | Variant-dependent |
| `--chip-color`        | Text color                                 | Variant-dependent |
| `--chip-border-color` | Border color                               | Variant-dependent |
| `--chip-radius`       | Border radius                              | `--rounded-full`  |
| `--chip-font-size`    | Font size                                  | `--text-sm`       |
| `--chip-font-weight`  | Font weight                                | `--font-medium`   |
| `--chip-padding-x`    | Horizontal padding                         | `--size-2-5`      |
| `--chip-padding-y`    | Vertical padding                           | `--size-0-5`      |
| `--chip-gap`          | Gap between icon, label, and remove button | `--size-1`        |

## Accessibility

The chip component follows WAI-ARIA best practices.

### `bit-chip`

✅ **Keyboard Navigation**

- The remove button is keyboard-accessible.
- When `disabled`, the remove button has the `disabled` attribute preventing activation.

✅ **Screen Readers**

- The remove button has a contextual `aria-label`: `"Remove {value}"` when `value` is set, `"Remove"` otherwise.
- Selectable chips use `role="checkbox"` and `aria-checked` while preserving the visible label as the accessible name.
- Action chips render as a `<button>` element; supply `aria-label` for icon-only chips.
- Use `value` to identify which chip triggered an event in a list.
