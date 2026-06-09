# Input

A customizable text input component with multiple types, variants, and validation states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible** — Full keyboard support, ARIA attributes, screen reader friendly
- <sg-icon name="rainbow" size="16"></sg-icon> **5 Semantic Colors** — primary, secondary, success, warning, error
- <sg-icon name="palette" size="16"></sg-icon> **6 Variants** — solid, flat, bordered, outline, ghost, text
- <sg-icon name="tag" size="16"></sg-icon> **Integrated Label** — Support for wide inset labels that span across slots
- <sg-icon name="lightbulb" size="16"></sg-icon> **Helper Text** — Add descriptive text or complex content below the input
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes** — sm, md, lg
- <sg-icon name="file-pen" size="16"></sg-icon> **7 Input Types** — text, email, password, search, url, tel, number
- <sg-icon name="wrench" size="16"></sg-icon> **Prefix/Suffix Slots** — Add icons or buttons before/after input

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/inputs/input/input.ts
:::

## Basic Usage

```html
<sg-input type="text" placeholder="Enter your name"></sg-input>
```

## Visual Options

### Variants

Six visual variants for different UI contexts and levels of emphasis.

<ComponentPreview>

```html
<sg-input variant="solid" placeholder="Solid"></sg-input>
<sg-input variant="flat" placeholder="Flat"></sg-input>
<sg-input variant="bordered" placeholder="Bordered"></sg-input>
<sg-input variant="outline" placeholder="Outline"></sg-input>
<sg-input variant="ghost" placeholder="Ghost"></sg-input>
<sg-input variant="text" placeholder="Text"></sg-input>
```

</ComponentPreview>

### Colors

Six semantic colors for different contexts and validation states. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<sg-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <sg-input variant="flat" placeholder="Default"></sg-input>
  <sg-input variant="flat" color="primary" placeholder="Primary"></sg-input>
  <sg-input variant="flat" color="secondary" placeholder="Secondary"></sg-input>
  <sg-input variant="flat" color="info" placeholder="Info"></sg-input>
  <sg-input variant="flat" color="success" placeholder="Success"></sg-input>
  <sg-input variant="flat" color="warning" placeholder="Warning"></sg-input>
  <sg-input variant="flat" color="error" placeholder="Error"></sg-input>
</sg-grid>
```

</ComponentPreview>

### Input Types

Different input types for various use cases.

<ComponentPreview center>

```html
<sg-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <sg-input variant="bordered" color="secondary" type="text" placeholder="Text input"></sg-input>
  <sg-input variant="bordered" color="success" type="email" placeholder="email@example.com"></sg-input>
  <sg-input variant="bordered" color="warning" type="password" placeholder="Password"></sg-input>
  <sg-input variant="bordered" color="error" type="number" placeholder="123"></sg-input>
</sg-grid>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<sg-grid cols="3">
  <sg-input variant="flat" size="sm" placeholder="Small"></sg-input>
  <sg-input variant="flat" size="md" placeholder="Medium"></sg-input>
  <sg-input variant="flat" size="lg" placeholder="Large"></sg-input>
  <sg-input variant="flat" size="sm" label="Small" placeholder="Small"></sg-input>
  <sg-input variant="flat" size="md" label="Medium" placeholder="Medium"></sg-input>
  <sg-input variant="flat" size="lg" label="Large" placeholder="Large"></sg-input>
</sg-grid>
```

</ComponentPreview>

### Rounded (Custom Border Radius)

Use the `rounded` attribute to apply border radius from the theme. Use it without a value (or `rounded="full"`) for pill shape, or specify a theme value like `"lg"`, `"xl"`, etc.

<ComponentPreview center>

```html
<!-- Default/Full: Pill shape (9999px) -->
<sg-input rounded placeholder="Search..." variant="flat">
  <sg-icon slot="prefix" name="search" size="18"></sg-icon>
</sg-input>

<!-- Large: 0.5rem / 8px -->
<sg-input rounded="lg" placeholder="Enter email" variant="bordered" label="Email"></sg-input>

<!-- Extra Large: 0.75rem / 12px -->
<sg-input rounded="xl" placeholder="Amount" variant="outline" size="lg">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</sg-input>

<!-- 2XL: 1rem / 16px -->
<sg-input rounded="2xl" placeholder="Full Name" variant="flat" color="error"></sg-input>

<!-- 3XL: 1.5rem / 24px -->
<sg-input rounded="3xl" placeholder="Website" variant="ghost"></sg-input>
```

</ComponentPreview>

## Customization

### Prefix & Suffix

Add prefix or suffix content like icons or clear buttons using slots.

<ComponentPreview center>

```html
<sg-input placeholder="Search...">
  <sg-icon slot="prefix" name="search" size="18"></sg-icon>
</sg-input>
<sg-input placeholder="Enter amount">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</sg-input>
```

</ComponentPreview>

### Integrated Label

Use the `label` attribute to render an inset label inside the input field, creating a modern Material Design-style floating label effect.

<ComponentPreview center>

```html
<sg-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <sg-input label="Full Name" placeholder="Jane Doe" value="Jane Doe"></sg-input>
  <sg-input label="Email Address" type="email" placeholder="you@example.com"></sg-input>
  <sg-input label="Phone Number" type="tel" value="+1 (555) 123-4567"></sg-input>
</sg-grid>
```

</ComponentPreview>

### Label with Variants

Labels work seamlessly with all variants and colors.

<ComponentPreview center>

```html
<sg-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <sg-input variant="solid" label="Username" value="johndoe"></sg-input>
  <sg-input variant="flat" color="secondary" label="Company" placeholder="Enter company name"></sg-input>
  <sg-input variant="bordered" color="success" label="Verified Email" value="user@company.com"></sg-input>
  <sg-input variant="outline" color="warning" label="Pending Review" value="Awaiting approval"></sg-input>
  <sg-input variant="ghost" label="Country" color="error" value="Germany"></sg-input>
  <sg-input variant="text" label="Notes" placeholder="Add your notes here"></sg-input>
</sg-grid>
```

</ComponentPreview>

### Label with Prefix/Suffix

Combine labels with prefix and suffix slots for rich input fields.

<ComponentPreview center>

```html
<sg-input label="Search" placeholder="Type to search...">
  <sg-icon slot="prefix" name="search" size="18"></sg-icon>
</sg-input>
<sg-input label="Amount" value="1250">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</sg-input>
<sg-input label="Website" type="url" value="example.com">
  <sg-icon slot="prefix" name="globe" size="18"></sg-icon>
</sg-input>
```

</ComponentPreview>

### Label Placement

Labels can be placed inside the input field (default) or above it.

<ComponentPreview center>

```html
<sg-input label="Inset Label" value="default behavior"></sg-input>
<sg-input label="Outside Label" label-placement="outside" value="placed above"></sg-input>
```

</ComponentPreview>

### Helper Text

Provide additional context or validation messages below the input using the `helper` attribute or slot.

<ComponentPreview center>

```html
<sg-input label="Password" type="password" helper="Must be at least 8 characters long"></sg-input>
```

</ComponentPreview>

## States

### Disabled & Readonly

Prevent interaction or modification of the input.

<ComponentPreview center>

```html
<sg-input disabled placeholder="Disabled input"></sg-input> <sg-input readonly value="Read-only value"></sg-input>
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

| Property                       | Description                                                   | Default           |
| ------------------------------ | ------------------------------------------------------------- | ----------------- |
| `--input-bg`                   | Background color                                              | Variant-dependent |
| `--input-color`                | Text color                                                    | Variant-dependent |
| `--input-border-color`         | Border color                                                  | Variant-dependent |
| `--input-placeholder-color`    | Placeholder text color                                        | Theme-dependent   |
| `--input-radius`               | Border radius                                                 | `var(--rounded-lg)` |
| `--input-padding`              | Inner padding (block inline)                                  | Size-dependent    |
| `--input-gap`                  | Gap between prefix/suffix icons and input text                | Size-dependent    |
| `--input-font-size`            | Font size                                                     | Size-dependent    |
| `--input-height`               | Field height                                                  | Size-dependent    |
| `--input-hover-bg`             | Field background on hover (flat/ghost variants)               | Variant-dependent |
| `--input-hover-border-color`   | Field border on hover (flat/bordered variants)                | Variant-dependent |
| `--input-focus-bg`             | Field background when focused (flat variant)                  | Variant-dependent |
| `--input-focus-border-color`   | Field border when focused (flat/text variants)                | Variant-dependent |

## Accessibility

The input component follows WCAG 2.1 Level AA standards.

### `sg-input`

<sg-icon name="circle-check" size="16"></sg-icon> **Keyboard Navigation**

- `Tab` focuses the input.
- Native input behavior (Enter to commit, etc.).

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

- Proper ARIA states (disabled, required, readonly).
- Associated labels via `aria-label` or `<label>`.

## Best Practices

### Onboard with Clear Microcopy

For first-run forms, combine a visible label, helper text, and progressive validation feedback.

<ComponentPreview center>

```html
<div style="display: grid; gap: 0.75rem; max-width: 26rem; width: 100%;">
  <sg-input
    label="Workspace name"
    placeholder="Acme Marketing"
    helper="This appears in invites and email notifications."
    clearable></sg-input>

  <sg-input
    type="email"
    label="Owner email"
    placeholder="you@company.com"
    helper="We will send setup instructions to this address."></sg-input>

  <sg-input
    type="text"
    label="Project key"
    value="acme space"
    error="Use lowercase letters, numbers, and dashes only."></sg-input>
</div>
```

</ComponentPreview>

**Do:**

- Use the `label` attribute for integrated labels with a modern floating effect.
- Use external `<label>` elements when the label needs to be positioned outside the input.
- Always provide a label via the `label` attribute, `aria-label`, or an associated `<label>` element.
- Use the appropriate `type` for better mobile keyboards and validation.
- Use semantic colors (`success`, `error`, `warning`) to indicate validation states.
- Combine labels with prefix/suffix slots for enhanced UX (e.g., currency symbols, icons).

**Don't:**

- Use placeholder text as a label replacement (placeholders disappear on input).
- Over-customize colors to the point of breaking contrast.
- Use labels for inputs that should remain visually minimal (ghost, text variants).
