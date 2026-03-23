# Input

A customizable text input component with multiple types, variants, and validation states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- ♿ **Accessible** — Full keyboard support, ARIA attributes, screen reader friendly
- 🌈 **5 Semantic Colors** — primary, secondary, success, warning, error
- 🎨 **6 Variants** — solid, flat, bordered, outline, ghost, text
- 🏷️ **Integrated Label** — Support for wide inset labels that span across slots
- 💡 **Helper Text** — Add descriptive text or complex content below the input
- 📏 **3 Sizes** — sm, md, lg
- 📝 **7 Input Types** — text, email, password, search, url, tel, number
- 🔧 **Prefix/Suffix Slots** — Add icons or buttons before/after input

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/form/input/input.ts
:::

## Basic Usage

```html
<bit-input type="text" placeholder="Enter your name"></bit-input>

<script type="module">
  import '@vielzeug/buildit/input';
</script>
```

## Visual Options

### Variants

Six visual variants for different UI contexts and levels of emphasis.

<ComponentPreview>

```html
<bit-input variant="solid" placeholder="Solid"></bit-input>
<bit-input variant="flat" placeholder="Flat"></bit-input>
<bit-input variant="bordered" placeholder="Bordered"></bit-input>
<bit-input variant="outline" placeholder="Outline"></bit-input>
<bit-input variant="ghost" placeholder="Ghost"></bit-input>
<bit-input variant="text" placeholder="Text"></bit-input>
```

</ComponentPreview>

### Colors

Six semantic colors for different contexts and validation states. Defaults to neutral when no color is specified.

<ComponentPreview center>

```html
<bit-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <bit-input variant="flat" placeholder="Default"></bit-input>
  <bit-input variant="flat" color="primary" placeholder="Primary"></bit-input>
  <bit-input variant="flat" color="secondary" placeholder="Secondary"></bit-input>
  <bit-input variant="flat" color="info" placeholder="Info"></bit-input>
  <bit-input variant="flat" color="success" placeholder="Success"></bit-input>
  <bit-input variant="flat" color="warning" placeholder="Warning"></bit-input>
  <bit-input variant="flat" color="error" placeholder="Error"></bit-input>
</bit-grid>
```

</ComponentPreview>

### Input Types

Different input types for various use cases.

<ComponentPreview center>

```html
<bit-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <bit-input variant="bordered" color="secondary" type="text" placeholder="Text input"></bit-input>
  <bit-input variant="bordered" color="success" type="email" placeholder="email@example.com"></bit-input>
  <bit-input variant="bordered" color="warning" type="password" placeholder="Password"></bit-input>
  <bit-input variant="bordered" color="error" type="number" placeholder="123"></bit-input>
</bit-grid>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<bit-grid cols="3">
  <bit-input variant="flat" size="sm" placeholder="Small"></bit-input>
  <bit-input variant="flat" size="md" placeholder="Medium"></bit-input>
  <bit-input variant="flat" size="lg" placeholder="Large"></bit-input>
  <bit-input variant="flat" size="sm" label="Small" placeholder="Small"></bit-input>
  <bit-input variant="flat" size="md" label="Medium" placeholder="Medium"></bit-input>
  <bit-input variant="flat" size="lg" label="Large" placeholder="Large"></bit-input>
</bit-grid>
```

</ComponentPreview>

### Rounded (Custom Border Radius)

Use the `rounded` attribute to apply border radius from the theme. Use it without a value (or `rounded="full"`) for pill shape, or specify a theme value like `"lg"`, `"xl"`, etc.

<ComponentPreview center>

```html
<!-- Default/Full: Pill shape (9999px) -->
<bit-input rounded placeholder="Search..." variant="flat">
  <span slot="prefix" class="material-symbols-rounded">search</span>
</bit-input>

<!-- Large: 0.5rem / 8px -->
<bit-input rounded="lg" placeholder="Enter email" variant="bordered" label="Email"></bit-input>

<!-- Extra Large: 0.75rem / 12px -->
<bit-input rounded="xl" placeholder="Amount" variant="outline" size="lg">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</bit-input>

<!-- 2XL: 1rem / 16px -->
<bit-input rounded="2xl" placeholder="Full Name" variant="flat" color="error"></bit-input>

<!-- 3XL: 1.5rem / 24px -->
<bit-input rounded="3xl" placeholder="Website" variant="ghost"></bit-input>
```

</ComponentPreview>

## Customization

### Prefix & Suffix

Add prefix or suffix content like icons or clear buttons using slots.

<ComponentPreview center>

```html
<bit-input placeholder="Search...">
  <span slot="prefix" class="material-symbols-rounded">search</span>
</bit-input>
<bit-input placeholder="Enter amount">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</bit-input>
```

</ComponentPreview>

### Integrated Label

Use the `label` attribute to render an inset label inside the input field, creating a modern Material Design-style floating label effect.

<ComponentPreview center>

```html
<bit-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <bit-input label="Full Name" placeholder="Jane Doe" value="Jane Doe"></bit-input>
  <bit-input label="Email Address" type="email" placeholder="you@example.com"></bit-input>
  <bit-input label="Phone Number" type="tel" value="+1 (555) 123-4567"></bit-input>
</bit-grid>
```

</ComponentPreview>

### Label with Variants

Labels work seamlessly with all variants and colors.

<ComponentPreview center>

```html
<bit-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="md" style="width: 100%;">
  <bit-input variant="solid" label="Username" value="johndoe"></bit-input>
  <bit-input variant="flat" color="secondary" label="Company" placeholder="Enter company name"></bit-input>
  <bit-input variant="bordered" color="success" label="Verified Email" value="user@company.com"></bit-input>
  <bit-input variant="outline" color="warning" label="Pending Review" value="Awaiting approval"></bit-input>
  <bit-input variant="ghost" label="Country" color="error" value="Germany"></bit-input>
  <bit-input variant="text" label="Notes" placeholder="Add your notes here"></bit-input>
</bit-grid>
```

</ComponentPreview>

### Label with Prefix/Suffix

Combine labels with prefix and suffix slots for rich input fields.

<ComponentPreview center>

```html
<bit-input label="Search" placeholder="Type to search...">
  <span slot="prefix" class="material-symbols-rounded">search</span>
</bit-input>
<bit-input label="Amount" value="1250">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</bit-input>
<bit-input label="Website" type="url" value="example.com">
  <span slot="prefix" class="material-symbols-rounded">language</span>
</bit-input>
```

</ComponentPreview>

### Label Placement

Labels can be placed inside the input field (default) or above it.

<ComponentPreview center>

```html
<bit-input label="Inset Label" value="default behavior"></bit-input>
<bit-input label="Outside Label" label-placement="outside" value="placed above"></bit-input>
```

</ComponentPreview>

### Helper Text

Provide additional context or validation messages below the input using the `helper` attribute or slot.

<ComponentPreview center>

```html
<bit-input label="Password" type="password" helper="Must be at least 8 characters long"></bit-input>
<bit-input label="Email Address">
  <div slot="helper" style="color: var(--color-primary); font-weight: 500;">
    <span class="material-symbols-rounded" style="font-size: 1rem; vertical-align: middle;">lightbulb</span>
    Verification link will be sent to this address
  </div>
</bit-input>
```

</ComponentPreview>

## States

### Disabled & Readonly

Prevent interaction or modification of the input.

<ComponentPreview center>

```html
<bit-input disabled placeholder="Disabled input"></bit-input> <bit-input readonly value="Read-only value"></bit-input>
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

| Property             | Description      | Default                    |
| -------------------- | ---------------- | -------------------------- |
| `--_theme-bg`        | Background color | `var(--color-contrast-50)` |
| `--_theme-radius`    | Border radius    | `var(--rounded-lg)`        |
| `--_theme-font-size` | Font size        | `var(--text-sm)`           |

## Accessibility

The input component follows WCAG 2.1 Level AA standards.

### `bit-input`

✅ **Keyboard Navigation**

- `Tab` focuses the input.
- Native input behavior (Enter to commit, etc.).

✅ **Screen Readers**

- Proper ARIA states (disabled, required, readonly).
- Associated labels via `aria-label` or `<label>`.

## Best Practices

### Onboard with Clear Microcopy

For first-run forms, combine a visible label, helper text, and progressive validation feedback.

<ComponentPreview center>

```html
<div style="display: grid; gap: 0.75rem; max-width: 26rem; width: 100%;">
  <bit-input
    label="Workspace name"
    placeholder="Acme Marketing"
    helper="This appears in invites and email notifications."
    clearable></bit-input>

  <bit-input
    type="email"
    label="Owner email"
    placeholder="you@company.com"
    helper="We will send setup instructions to this address."></bit-input>

  <bit-input
    type="text"
    label="Project key"
    value="acme space"
    error="Use lowercase letters, numbers, and dashes only."></bit-input>
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
