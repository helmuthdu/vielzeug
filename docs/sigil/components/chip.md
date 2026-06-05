# Chip

A compact, styled label for tags, filters, and selected values. Supports a leading icon, interaction modes (static, removable, selectable), all color themes, five variants, and three sizes. Used internally by `sg-select` and `sg-combobox` in multiselect mode.

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
<<< @/../packages/sigil/src/feedback/chip/chip.ts
:::

## Basic Usage

<ComponentPreview center>

```html
<sg-chip>Design</sg-chip>
<sg-chip color="primary">TypeScript</sg-chip>
<sg-chip color="success">Approved</sg-chip>
<sg-chip color="warning">Pending</sg-chip>
<sg-chip color="error">Rejected</sg-chip>
```

</ComponentPreview>

## Variants

Five visual variants for different levels of emphasis.

<ComponentPreview center>

```html
<sg-chip color="primary" variant="solid">Solid</sg-chip>
<sg-chip color="primary" variant="flat">Flat</sg-chip>
<sg-chip color="primary" variant="bordered">Bordered</sg-chip>
<sg-chip color="primary" variant="outline">Outline</sg-chip>
<sg-chip color="primary" variant="ghost">Ghost</sg-chip>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<sg-chip variant="flat">Default</sg-chip>
<sg-chip variant="flat" color="primary">Primary</sg-chip>
<sg-chip variant="flat" color="secondary">Secondary</sg-chip>
<sg-chip variant="flat" color="info">Info</sg-chip>
<sg-chip variant="flat" color="success">Success</sg-chip>
<sg-chip variant="flat" color="warning">Warning</sg-chip>
<sg-chip variant="flat" color="error">Error</sg-chip>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<sg-chip color="primary" size="sm">Small</sg-chip>
<sg-chip color="primary" size="md">Medium</sg-chip>
<sg-chip color="primary" size="lg">Large</sg-chip>
```

</ComponentPreview>

## Removable

Set `mode="removable"` to show a × button. Listen for `remove` to handle removal. The `value` attribute is included in the event detail.

<ComponentPreview center>

```html
<sg-chip color="primary" variant="flat" mode="removable" value="ts">TypeScript</sg-chip>
<sg-chip color="success" variant="flat" mode="removable" value="go">Go</sg-chip>
<sg-chip color="warning" variant="flat" mode="removable" value="rust">Rust</sg-chip>
```

</ComponentPreview>

```js
document.querySelectorAll('sg-chip').forEach((chip) => {
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
<sg-chip mode="selectable" value="design">Design</sg-chip>
<sg-chip mode="selectable" default-checked value="ux">UX</sg-chip>
```

</ComponentPreview>

```js
document.querySelectorAll('sg-chip[mode="selectable"]').forEach((chip) => {
  chip.addEventListener('change', (e) => {
    console.log('checked:', e.detail.checked, 'value:', e.detail.value, 'source:', e.detail.originalEvent?.type);
  });
});
```

## Action

Set `mode="action"` to make the chip behave like a button — it fires a `click` event but holds no internal state. Use it for quick actions, command triggers, or suggestion pills.

<ComponentPreview center>

```html
<sg-chip mode="action" value="add">Add Tag</sg-chip>
<sg-chip mode="action" color="primary" variant="flat" value="star">
  <sg-icon slot="icon" name="star" size="12"></sg-icon>
  Favourite
</sg-chip>
<sg-chip mode="action" color="error" variant="ghost" value="delete" aria-label="Delete item">
  <sg-icon slot="icon" name="trash-2" size="12"></sg-icon>
  Remove
</sg-chip>

<script type="module">
  import '@vielzeug/sigil/chip';
  import '@vielzeug/sigil/icon';
</script>
```

</ComponentPreview>

```js
document.querySelectorAll('sg-chip[mode="action"]').forEach((chip) => {
  chip.addEventListener('click', (e) => {
    console.log('action:', e.detail.value, 'source:', e.detail.originalEvent?.type);
  });
});
```

## With Icon

Use the `icon` named slot to prepend a leading icon or glyph.

<ComponentPreview center>

```html
<sg-chip color="success" variant="flat">
  <sg-icon slot="icon" name="check" size="12"></sg-icon>
  Verified
</sg-chip>
<sg-chip color="primary" variant="bordered">
  <sg-icon slot="icon" name="clock" size="12"></sg-icon>
  Pending
</sg-chip>

<script type="module">
  import '@vielzeug/sigil/chip';
  import '@vielzeug/sigil/icon';
</script>
```

</ComponentPreview>

## Rounded

Override the border radius with the `rounded` attribute.

<ComponentPreview center>

```html
<sg-chip variant="bordered" color="primary" rounded="none">None</sg-chip>
<sg-chip variant="bordered" color="primary" rounded="sm">Small</sg-chip>
<sg-chip variant="bordered" color="primary" rounded="md">Medium</sg-chip>
<sg-chip variant="bordered" color="primary" rounded="lg">Large</sg-chip>
<sg-chip variant="bordered" color="primary" rounded="full">Full</sg-chip>
```

</ComponentPreview>

## Disabled

<ComponentPreview center>

```html
<sg-chip color="primary" variant="flat" disabled mode="removable">Disabled chip</sg-chip>
```

</ComponentPreview>

## Building a Tag Input

Chips are designed to compose with form controls. Here is a minimal tag-input pattern built on top of `sg-chip`:

<ComponentPreview vertical>

```html
<div id="tag-wrap" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
  <sg-chip color="primary" variant="flat" mode="removable" value="design">Design</sg-chip>
  <sg-chip color="primary" variant="flat" mode="removable" value="ux">UX</sg-chip>
  <sg-chip color="primary" variant="flat" mode="removable" value="a11y">Accessibility</sg-chip>
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

### `sg-chip`

✅ **Keyboard Navigation**

- The remove button is keyboard-accessible.
- When `disabled`, the remove button has the `disabled` attribute preventing activation.

✅ **Screen Readers**

- The remove button has a contextual `aria-label`: `"Remove {value}"` when `value` is set, `"Remove"` otherwise.
- Selectable chips use `role="checkbox"` and `aria-checked` while preserving the visible label as the accessible name.
- Action chips render as a `<button>` element; supply `aria-label` for icon-only chips.
- Use `value` to identify which chip triggered an event in a list.
