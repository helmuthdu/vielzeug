# Input Component

A customizable text input component with multiple types, variants, and validation states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🎨 **6 Variants**: solid, flat, bordered, outline, ghost, text
- 🌈 **5 Semantic Colors**: primary, secondary, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full keyboard support, ARIA attributes, screen reader friendly
- 🔧 **Prefix/Suffix Slots**: Add icons or buttons before/after input
- 📝 **7 Input Types**: text, email, password, search, url, tel, number
- 🌙 **Theme Support**: Works with light/dark mode

## Basic Usage

```html
<!DOCTYPE html>
<html>
  <body>
    <bit-input type="text" placeholder="Enter your name"></bit-input>
    <bit-input type="email" placeholder="email@example.com" required></bit-input>
    <bit-input type="password" placeholder="Password" disabled></bit-input>

    <script type="module">
      import '@vielzeug/buildit/input';
    </script>
  </body>
</html>
```

## Variants

The input comes with six visual variants:

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

**Use cases:**

- **Solid**: Default input style with background
- **Flat**: Subtle, low-emphasis inputs
- **Bordered**: Clear field boundaries
- **Outline**: Minimal with border focus
- **Ghost**: Transparent, blends with background
- **Text**: Ultra-minimal, inline-style input

## Colors

Five semantic colors for different contexts:

<ComponentPreview>

```html
<bit-input color="primary" placeholder="Primary"></bit-input>
<bit-input color="secondary" placeholder="Secondary"></bit-input>
<bit-input color="success" placeholder="Success"></bit-input>
<bit-input color="warning" placeholder="Warning"></bit-input>
<bit-input color="error" placeholder="Error"></bit-input>
```

</ComponentPreview>

## Sizes

Three sizes for different contexts:

<ComponentPreview vertical>

```html
<bit-input size="sm" placeholder="Small"></bit-input>
<bit-input size="md" placeholder="Medium"></bit-input>
<bit-input size="lg" placeholder="Large"></bit-input>
```

</ComponentPreview>

## Input Types

Different input types for various use cases:

<ComponentPreview vertical>

```html
<bit-input type="text" placeholder="Text input"></bit-input>
<bit-input type="email" placeholder="email@example.com"></bit-input>
<bit-input type="password" placeholder="Password"></bit-input>
<bit-input type="search" placeholder="Search..."></bit-input>
<bit-input type="url" placeholder="https://example.com"></bit-input>
<bit-input type="tel" placeholder="+1 (555) 123-4567"></bit-input>
<bit-input type="number" placeholder="123"></bit-input>
```

</ComponentPreview>

## With Slots

Add prefix or suffix content using slots:

<ComponentPreview vertical>

```html
<bit-input placeholder="Search...">
  <span slot="prefix">🔍</span>
</bit-input>
<bit-input placeholder="Enter amount">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</bit-input>
<bit-input placeholder="Enter email">
  <span slot="prefix">📧</span>
</bit-input>
```

</ComponentPreview>

## States

### Disabled

<ComponentPreview>

```html
<bit-input disabled placeholder="Disabled input"></bit-input>
```

</ComponentPreview>

### Readonly

<ComponentPreview>

```html
<bit-input readonly value="Read-only value"></bit-input>
```

</ComponentPreview>

### Required

<ComponentPreview>

```html
<bit-input required placeholder="Required field"></bit-input>
```

</ComponentPreview>

## Form Integration

Inputs work seamlessly with native HTML forms:

<ComponentPreview vertical>

```html
<form style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 300px;">
  <bit-input type="email" name="email" placeholder="Email" required>
    <span slot="prefix">📧</span>
  </bit-input>
  <bit-input type="password" name="password" placeholder="Password" required>
    <span slot="prefix">🔒</span>
  </bit-input>
  <bit-button type="submit">Login</bit-button>
</form>
```

</ComponentPreview>

## Custom Styling

Customize appearance using CSS custom properties:

<ComponentPreview vertical>

```html
<bit-input
  placeholder="Custom gradient"
  style="--input-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%); --input-color: white; --input-radius: 20px;">
</bit-input>
<bit-input
  placeholder="Custom colors"
  style="--input-bg: #ffe4e6; --input-border-color: #fb7185; --input-color: #881337;">
</bit-input>
```

</ComponentPreview>

### Available CSS Custom Properties

#### Colors & Backgrounds

- `--input-bg` - Background color
- `--input-color` - Text color
- `--input-border-color` - Border color
- `--input-focus-border-color` - Focus border color
- `--input-placeholder-color` - Placeholder text color

#### Borders & Spacing

- `--input-radius` - Border radius
- `--input-padding-x` - Horizontal padding
- `--input-padding-y` - Vertical padding

#### Typography

- `--input-font-size` - Font size

## Real-World Examples

### Login Form

<ComponentPreview vertical>

```html
<form style="max-width: 300px;">
  <bit-input type="email" name="email" placeholder="Email" required variant="bordered">
    <span slot="prefix">📧</span>
  </bit-input>
  <br /><br />
  <bit-input type="password" name="password" placeholder="Password" required variant="bordered">
    <span slot="prefix">🔒</span>
  </bit-input>
</form>
```

</ComponentPreview>

### Search Bar

<ComponentPreview>

```html
<bit-input type="search" placeholder="Search products..." variant="ghost" size="lg">
  <span slot="prefix">🔍</span>
</bit-input>
```

</ComponentPreview>

### Price Input

<ComponentPreview>

```html
<bit-input type="number" placeholder="0.00" variant="bordered">
  <span slot="prefix">$</span>
  <span slot="suffix">USD</span>
</bit-input>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute     | Type                                                                        | Default     | Description              |
| ------------- | --------------------------------------------------------------------------- | ----------- | ------------------------ |
| `type`        | `'text' \| 'email' \| 'password' \| 'search' \| 'url' \| 'tel' \| 'number'` | `'text'`    | Input type               |
| `value`       | `string`                                                                    | `''`        | Current input value      |
| `name`        | `string`                                                                    | `''`        | Form field name          |
| `placeholder` | `string`                                                                    | `''`        | Placeholder text         |
| `disabled`    | `boolean`                                                                   | `false`     | Disable the input        |
| `readonly`    | `boolean`                                                                   | `false`     | Make the input read-only |
| `required`    | `boolean`                                                                   | `false`     | Mark field as required   |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                      | `'md'`      | Input size               |
| `variant`     | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'`         | `'solid'`   | Visual variant           |
| `color`       | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`             | `'primary'` | Color theme              |

### Slots

| Slot     | Description                                        |
| -------- | -------------------------------------------------- |
| `prefix` | Content before the input (e.g., icon)              |
| `suffix` | Content after the input (e.g., clear button, unit) |

### Events

| Event    | Detail                                    | Description                                     |
| -------- | ----------------------------------------- | ----------------------------------------------- |
| `input`  | `{ value: string, originalEvent: Event }` | Emitted when the value changes (user input)     |
| `change` | `{ value: string, originalEvent: Event }` | Emitted when value is committed (blur or Enter) |

### CSS Custom Properties

| Property                     | Description            | Default                      |
| ---------------------------- | ---------------------- | ---------------------------- |
| `--input-bg`                 | Background color       | `var(--color-contrast-50)`   |
| `--input-color`              | Text color             | `var(--color-contrast-900)`  |
| `--input-border-color`       | Border color           | `var(--color-contrast-300)`  |
| `--input-focus-border-color` | Focus border color     | `var(--color-primary-focus)` |
| `--input-placeholder-color`  | Placeholder text color | `var(--color-contrast-500)`  |
| `--input-radius`             | Border radius          | `var(--rounded-md)`          |
| `--input-padding-x`          | Horizontal padding     | `var(--size-3)`              |
| `--input-padding-y`          | Vertical padding       | `var(--size-2)`              |
| `--input-font-size`          | Font size              | `var(--text-sm)`             |

## Accessibility

The input component follows WCAG 2.1 Level AA standards:

### Keyboard Navigation

- **Tab** – Focus the input
- **Escape** – Clear focus
- Native input keyboard behavior

### Screen Reader Support

- Proper label association via `aria-label` or associated `<label>`
- State announcements (disabled, required, readonly)
- Error messages via `aria-describedby` (when used with form validation)

### Focus Management

- Visible focus indicator
- Respects `prefers-reduced-motion`
- Proper focus order in forms

### Best Practices

Always use a label with inputs:

```html
<label for="email-input">Email Address</label>
<bit-input id="email-input" type="email" name="email" required> </bit-input>
```

Or use `aria-label` for standalone inputs:

```html
<bit-input type="search" aria-label="Search products" placeholder="Search..."> </bit-input>
```

## Framework Integration

::: code-group

```tsx [React]
import '@vielzeug/buildit/input';

function ContactForm() {
  const [email, setEmail] = React.useState('');

  return (
    <bit-input
      type="email"
      value={email}
      onInput={(e: any) => setEmail(e.detail.value)}
      placeholder="Enter email"
      required
    />
  );
}
```

```vue [Vue]
<template>
  <bit-input type="email" :value="email" @input="handleInput" placeholder="Enter email" required />
</template>

<script setup>
import { ref } from 'vue';
import '@vielzeug/buildit/input';

const email = ref('');

const handleInput = (e) => {
  email.value = e.detail.value;
};
</script>
```

```svelte [Svelte]
<script>
  import '@vielzeug/buildit/input';

  let email = '';

  function handleInput(e) {
    email = e.detail.value;
  }
</script>

<bit-input
  type="email"
  value={email}
  on:input={handleInput}
  placeholder="Enter email"
  required
/>
```

:::

## TypeScript

Full TypeScript support with type definitions:

```typescript
import '@vielzeug/buildit/input';
import type { InputProps } from '@vielzeug/buildit/types';

const inputElement = document.querySelector('bit-input');

// Type-safe event handling
inputElement?.addEventListener(
  'input',
  (
    e: CustomEvent<{
      value: string;
      originalEvent: Event;
    }>,
  ) => {
    console.log('New value:', e.detail.value);
  },
);
```

## Related Components

- **[Button](./button.md)** – Use in forms with submit buttons
- **[Checkbox](./checkbox.md)** – For boolean form inputs
- **[Radio](./radio.md)** – For exclusive selection inputs

## See Also

- [Form Validation Guide](../examples.md#form-validation)
- [Input Patterns](../examples.md#input-patterns)
- [API Reference](../api.md)
