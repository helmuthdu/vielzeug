# Checkbox Component

A customizable checkbox component with multiple colors, sizes, and states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🌈 **5 Semantic Colors**: primary, secondary, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full keyboard support, ARIA attributes, screen reader friendly
- 🎭 **States**: checked, unchecked, indeterminate, disabled
- 🔧 **Customizable**: CSS custom properties for styling

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/checkbox/checkbox.ts
:::

## Basic Usage

```html
<bit-checkbox>Accept terms and conditions</bit-checkbox>

<script type="module">
  import '@vielzeug/buildit/checkbox';
</script>
```

## Visual Options

### Colors

Five semantic colors for different contexts.

<ComponentPreview>

```html
<bit-checkbox checked color="primary">Primary</bit-checkbox>
<bit-checkbox checked color="secondary">Secondary</bit-checkbox>
<bit-checkbox checked color="success">Success</bit-checkbox>
<bit-checkbox checked color="warning">Warning</bit-checkbox>
<bit-checkbox checked color="error">Error</bit-checkbox>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<bit-checkbox checked size="sm">Small</bit-checkbox>
<bit-checkbox checked size="md">Medium</bit-checkbox>
<bit-checkbox checked size="lg">Large</bit-checkbox>
```


</ComponentPreview>

## States

### Indeterminate

Useful for "select all" patterns where some items are selected.

<ComponentPreview center>

```html
<bit-checkbox indeterminate>Indeterminate</bit-checkbox>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity for unavailable options.

<ComponentPreview center>

```html
<bit-checkbox disabled>Disabled unchecked</bit-checkbox>
<bit-checkbox checked disabled>Disabled checked</bit-checkbox>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute       | Type                                                            | Default     | Description                   |
| --------------- | --------------------------------------------------------------- | ----------- | ----------------------------- |
| `checked`       | `boolean`                                                       | `false`     | Checkbox checked state        |
| `disabled`      | `boolean`                                                       | `false`     | Disable the checkbox          |
| `indeterminate` | `boolean`                                                       | `false`     | Show indeterminate state      |
| `color`         | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color                |
| `size`          | `'sm' \| 'md' \| 'lg'`                                          | `'md'`      | Checkbox size                 |
| `name`          | `string`                                                        | -           | Form field name               |
| `value`         | `string`                                                        | -           | Form field value when checked |

### Slots

| Slot      | Description            |
| --------- | ---------------------- |
| (default) | Checkbox label content |

### Events

| Event    | Detail                                                              | Description                        |
| -------- | ------------------------------------------------------------------- | ---------------------------------- |
| `change` | `{ checked: boolean, value: string \| null, originalEvent: Event }` | Emitted when checked state changes |

## CSS Custom Properties

| Property | Description | Default |
|----------|-------------|---------|
| `--checkbox-size` | Size of the square | Size-dependent |
| `--checkbox-radius` | Border radius | `0.375rem` |
| `--checkbox-checked-bg` | Background when checked | Color-dependent |

## Accessibility

The checkbox component follows WAI-ARIA best practices.

✅ **Keyboard Navigation**
- `Space` and `Enter` toggle the checkbox.
- `Tab` moves focus to/from the checkbox.

✅ **Screen Readers**
- Announces checkbox role and label.
- `aria-checked` reflects current state (true, false, mixed).

## Best Practices

**Do:**
- Use clear, concise labels.
- Use indeterminate state for "select all" patterns.

**Don't:**
- Use checkboxes for mutually exclusive options (use radio buttons).
- Hide critical options using the disabled state.
