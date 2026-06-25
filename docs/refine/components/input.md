# Input

A customizable text input component with multiple types, variants, and validation states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Variants

Six visual variants for different UI contexts and levels of emphasis.

<ComponentPreview>

```html
<ore-input variant="solid" placeholder="Solid"></ore-input>
<ore-input variant="flat" placeholder="Flat"></ore-input>
<ore-input variant="bordered" placeholder="Bordered"></ore-input>
<ore-input variant="outline" placeholder="Outline"></ore-input>
<ore-input variant="ghost" placeholder="Ghost"></ore-input>
<ore-input variant="text" placeholder="Text"></ore-input>
```

</ComponentPreview>

## Colors

Six semantic colors for different contexts and validation states. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<ore-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <ore-input variant="flat" placeholder="Default"></ore-input>
  <ore-input variant="flat" color="primary" placeholder="Primary"></ore-input>
  <ore-input variant="flat" color="secondary" placeholder="Secondary"></ore-input>
  <ore-input variant="flat" color="info" placeholder="Info"></ore-input>
  <ore-input variant="flat" color="success" placeholder="Success"></ore-input>
  <ore-input variant="flat" color="warning" placeholder="Warning"></ore-input>
  <ore-input variant="flat" color="error" placeholder="Error"></ore-input>
</ore-grid>
```

</ComponentPreview>

## Input Types

Different input types for various use cases.

<ComponentPreview center>

```html
<ore-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <ore-input variant="bordered" color="secondary" type="text" placeholder="Text input"></ore-input>
  <ore-input variant="bordered" color="success" type="email" placeholder="email@example.com"></ore-input>
  <ore-input variant="bordered" color="warning" type="password" placeholder="Password"></ore-input>
  <ore-input variant="bordered" color="error" type="number" placeholder="123"></ore-input>
</ore-grid>
```

</ComponentPreview>

## Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<ore-grid cols="3">
  <ore-input variant="flat" size="sm" placeholder="Small"></ore-input>
  <ore-input variant="flat" size="md" placeholder="Medium"></ore-input>
  <ore-input variant="flat" size="lg" placeholder="Large"></ore-input>
  <ore-input variant="flat" size="sm" label="Small" placeholder="Small"></ore-input>
  <ore-input variant="flat" size="md" label="Medium" placeholder="Medium"></ore-input>
  <ore-input variant="flat" size="lg" label="Large" placeholder="Large"></ore-input>
</ore-grid>
```

</ComponentPreview>

## Rounded (Custom Border Radius)

Use the `rounded` attribute to apply border radius from the theme. Use it without a value (or `rounded="full"`) for pill shape, or specify a theme value like `"lg"`, `"xl"`, etc.

<ComponentPreview center>

```html
<!-- Default/Full: Pill shape (9999px) -->
<ore-input rounded placeholder="Search..." variant="flat">
  <ore-icon slot="prefix" name="search" size="18"></ore-icon>
</ore-input>

<!-- Large: 0.5rem / 8px -->
<ore-input rounded="lg" placeholder="Enter email" variant="bordered" label="Email"></ore-input>

<!-- Extra Large: 0.75rem / 12px -->
<ore-input rounded="xl" placeholder="Amount" variant="outline" size="lg">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</ore-input>

<!-- 2XL: 1rem / 16px -->
<ore-input rounded="2xl" placeholder="Full Name" variant="flat" color="error"></ore-input>

<!-- 3XL: 1.5rem / 24px -->
<ore-input rounded="3xl" placeholder="Website" variant="ghost"></ore-input>
```

</ComponentPreview>

## Customization

### Prefix & Suffix

Add prefix or suffix content like icons or clear buttons using slots.

<ComponentPreview center>

```html
<ore-input placeholder="Search...">
  <ore-icon slot="prefix" name="search" size="18"></ore-icon>
</ore-input>
<ore-input placeholder="Enter amount">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</ore-input>
```

</ComponentPreview>

### Integrated Label

Use the `label` attribute to render an inset label inside the input field, creating a modern Material Design-style floating label effect. Always provide a label via the `label` attribute, `aria-label`, or an associated `<label>` element — do not rely on placeholder text as a label replacement, as placeholders disappear on input.

<ComponentPreview center>

```html
<ore-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <ore-input label="Full Name" placeholder="Jane Doe" value="Jane Doe"></ore-input>
  <ore-input label="Email Address" type="email" placeholder="you@example.com"></ore-input>
  <ore-input label="Phone Number" type="tel" value="+1 (555) 123-4567"></ore-input>
</ore-grid>
```

</ComponentPreview>

### Label with Variants

Labels work seamlessly with all variants and colors.

<ComponentPreview center>

```html
<ore-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <ore-input variant="solid" label="Username" value="johndoe"></ore-input>
  <ore-input variant="flat" color="secondary" label="Company" placeholder="Enter company name"></ore-input>
  <ore-input variant="bordered" color="success" label="Verified Email" value="user@company.com"></ore-input>
  <ore-input variant="outline" color="warning" label="Pending Review" value="Awaiting approval"></ore-input>
  <ore-input variant="ghost" label="Country" color="error" value="Germany"></ore-input>
  <ore-input variant="text" label="Notes" placeholder="Add your notes here"></ore-input>
</ore-grid>
```

</ComponentPreview>

### Label with Prefix/Suffix

Combine labels with prefix and suffix slots for rich input fields.

<ComponentPreview center>

```html
<ore-input label="Search" placeholder="Type to search...">
  <ore-icon slot="prefix" name="search" size="18"></ore-icon>
</ore-input>
<ore-input label="Amount" value="1250">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</ore-input>
<ore-input label="Website" type="url" value="example.com">
  <ore-icon slot="prefix" name="globe" size="18"></ore-icon>
</ore-input>
```

</ComponentPreview>

### Label Placement

Labels can be placed inside the input field (default) or above it.

<ComponentPreview center>

```html
<ore-input label="Inset Label" value="default behavior"></ore-input>
<ore-input label="Outside Label" label-placement="outside" value="placed above"></ore-input>
```

</ComponentPreview>

### Helper Text

Provide additional context or validation messages below the input using the `helper` attribute or slot.

<ComponentPreview center>

```html
<ore-input label="Password" type="password" helper="Must be at least 8 characters long"></ore-input>
```

</ComponentPreview>

## States

### Disabled & Readonly

Prevent interaction or modification of the input.

<ComponentPreview center>

```html
<ore-input disabled placeholder="Disabled input"></ore-input> <ore-input readonly value="Read-only value"></ore-input>
```

</ComponentPreview>

For first-run forms, combine a visible label, helper text, and progressive validation feedback.

<ComponentPreview center>

```html
<div style="display: grid; gap: 0.75rem; max-width: 26rem; width: 100%;">
  <ore-input
    label="Workspace name"
    placeholder="Acme Marketing"
    helper="This appears in invites and email notifications."
    clearable></ore-input>

  <ore-input
    type="email"
    label="Owner email"
    placeholder="you@company.com"
    helper="We will send setup instructions to this address."></ore-input>

  <ore-input
    type="text"
    label="Project key"
    value="acme space"
    error="Use lowercase letters, numbers, and dashes only."></ore-input>
</div>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute         | Type                                                                        | Default     | Description              |
| ----------------- | --------------------------------------------------------------------------- | ----------- | ------------------------ |
| `type`            | `'text' \| 'email' \| 'password' \| 'search' \| 'url' \| 'tel' \| 'number'` | `'text'`    | Input type               |
| `value`           | `string`                                                                    | `''`        | Current input value      |
| `name`            | `string`                                                                    | `''`        | Form field name          |
| `placeholder`     | `string`                                                                    | `''`        | Placeholder text         |
| `label`           | `string`                                                                    | `''`        | Label text               |
| `label-placement` | `'inset' \| 'outside'`                                                      | `'inset'`   | Label placement          |
| `helper`          | `string`                                                                    | `''`        | Helper text below input  |
| `disabled`        | `boolean`                                                                   | `false`     | Disable the input        |
| `readonly`        | `boolean`                                                                   | `false`     | Make the input read-only |
| `required`        | `boolean`                                                                   | `false`     | Mark field as required   |
| `fullwidth`       | `boolean`                                                                   | `false`     | Expand to full width     |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                      | `'md'`      | Input size               |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'`         | `'solid'`   | Visual variant           |
| `color`           | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`             | `'primary'` | Color theme              |

### Slots

| Slot     | Description                                        |
| -------- | -------------------------------------------------- |
| `prefix` | Content before the input (e.g., icon)              |
| `suffix` | Content after the input (e.g., clear button, unit) |
| `helper` | Complex helper content below the input             |

### Events

| Event    | Detail                                    | Description                                     |
| -------- | ----------------------------------------- | ----------------------------------------------- |
| `input`  | `{ value: string, originalEvent: Event }` | Emitted when the value changes (user input)     |
| `change` | `{ value: string, originalEvent: Event }` | Emitted when value is committed (blur or Enter) |

### CSS Custom Properties

| Property                     | Description                                     | Default             |
| ---------------------------- | ----------------------------------------------- | ------------------- |
| `--input-bg`                 | Background color                                | Variant-dependent   |
| `--input-color`              | Text color                                      | Variant-dependent   |
| `--input-border-color`       | Border color                                    | Variant-dependent   |
| `--input-placeholder-color`  | Placeholder text color                          | Theme-dependent     |
| `--input-radius`             | Border radius                                   | `var(--rounded-lg)` |
| `--input-padding`            | Inner padding (block inline)                    | Size-dependent      |
| `--input-gap`                | Gap between prefix/suffix icons and input text  | Size-dependent      |
| `--input-font-size`          | Font size                                       | Size-dependent      |
| `--input-height`             | Field height                                    | Size-dependent      |
| `--input-hover-bg`           | Field background on hover (flat/ghost variants) | Variant-dependent   |
| `--input-hover-border-color` | Field border on hover (flat/bordered variants)  | Variant-dependent   |
| `--input-focus-bg`           | Field background when focused (flat variant)    | Variant-dependent   |
| `--input-focus-border-color` | Field border when focused (flat/text variants)  | Variant-dependent   |

## Accessibility

The input component follows WCAG 2.1 Level AA standards. Pressing `Tab` moves focus to the input, and native input behavior applies (e.g., Enter to commit). Proper ARIA states are reflected for disabled, required, and readonly conditions. Labels are associated via `aria-label` or `<label>` elements — always provide one through the `label` attribute, an explicit `aria-label`, or an associated `<label>` element. Use semantic colors (`success`, `error`, `warning`) to convey validation states alongside text, not color alone.
