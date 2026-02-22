# Radio Component

A customizable radio button component with multiple colors, sizes, and states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🌈 **5 Semantic Colors**: primary, secondary, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full keyboard support, ARIA attributes, screen reader friendly, arrow key navigation
- 🎭 **States**: checked, unchecked, disabled
- 🔧 **Customizable**: CSS custom properties for styling
- 🎯 **Radio Group**: Mutually exclusive selection within groups

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/radio/radio.ts
:::

## Basic Usage

```html
<bit-radio name="choice" value="option1" checked>Option 1</bit-radio>
<bit-radio name="choice" value="option2">Option 2</bit-radio>

<script type="module">
  import '@vielzeug/buildit/radio';
</script>
```

::: tip Radio Groups
Radio buttons with the same `name` attribute form a group where only one can be selected at a time. The `name` attribute is required for proper radio button behavior.
:::

## Visual Options

### Colors

Five semantic colors for different contexts.

<ComponentPreview vertical>

```html
<bit-radio checked name="color-1" color="primary">Primary</bit-radio>
<bit-radio checked name="color-2" color="secondary">Secondary</bit-radio>
<bit-radio checked name="color-3" color="success">Success</bit-radio>
<bit-radio checked name="color-4" color="warning">Warning</bit-radio>
<bit-radio checked name="color-5" color="error">Error</bit-radio>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview vertical>

```html
<bit-radio checked name="size-sm" size="sm">Small</bit-radio>
<bit-radio checked name="size-md" size="md">Medium</bit-radio>
<bit-radio checked name="size-lg" size="lg">Large</bit-radio>
```


</ComponentPreview>

## States

### Disabled

Prevent interaction and reduce opacity for unavailable options.

<ComponentPreview vertical>

```html
<bit-radio name="disabled-1" disabled>Disabled unchecked</bit-radio>
<bit-radio name="disabled-2" checked disabled>Disabled checked</bit-radio>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                                                            | Default     | Description                             |
| ---------- | --------------------------------------------------------------- | ----------- | --------------------------------------- |
| `checked`  | `boolean`                                                       | `false`     | Radio button checked state              |
| `disabled` | `boolean`                                                       | `false`     | Disable the radio button                |
| `color`    | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color                          |
| `size`     | `'sm' \| 'md' \| 'lg'`                                          | `'md'`      | Radio button size                       |
| `name`     | `string`                                                        | -           | Form field name (required for grouping) |
| `value`    | `string`                                                        | -           | Form field value when checked           |

### Slots

| Slot      | Description                |
| --------- | -------------------------- |
| (default) | Radio button label content |

### Events

| Event    | Detail                                                      | Description                                                     |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `change` | `{ checked: boolean, value: string, originalEvent: Event }` | Emitted when checked state changes (only when becoming checked) |

## CSS Custom Properties

| Property | Description | Default |
|----------|-------------|---------|
| `--radio-size` | Size of the circle | Size-dependent |
| `--radio-checked-bg` | Background when checked | Color-dependent |
| `--radio-color` | Inner dot color | `white` |

## Accessibility

The radio button component follows WAI-ARIA best practices.

✅ **Keyboard Navigation**
- `Space` and `Enter` select the radio button.
- `Tab` moves focus to/from the radio group.
- `Arrow Keys` navigate and select between items in a group.

✅ **Screen Readers**
- Announces radio role and label.
- `aria-checked` reflects current state.

## Best Practices

**Do:**
- Always use the `name` attribute to group related radios.
- Provide a default selection when appropriate.

**Don't:**
- Use radio buttons for non-mutually exclusive options (use checkboxes).
- Have only one radio button in a group.
