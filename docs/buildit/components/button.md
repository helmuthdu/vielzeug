# Button Component

A versatile button component with multiple variants, colors, sizes, and states. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🎨 **6 Variants**: solid, flat, bordered, outline, ghost, text
- 🌈 **5 Semantic Colors**: primary, secondary, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: Full keyboard support, ARIA attributes, screen reader friendly
- 🎭 **States**: loading, disabled
- 🔧 **Customizable**: CSS custom properties for styling
- 🌙 **Theme Support**: Works with light/dark mode

## Basic Usage

```html
<!DOCTYPE html>
<html>
  <body>
    <bit-button>Click me</bit-button>
    <bit-button variant="outline" color="secondary">Cancel</bit-button>
    <bit-button loading>Processing...</bit-button>

    <script type="module">
      import '@vielzeug/components/button';
    </script>
  </body>
</html>
```

## Variants

The button comes with six visual variants:

<ComponentPreview>

```html
<bit-button variant="solid">Solid</bit-button>
<bit-button variant="flat">Flat</bit-button>
<bit-button variant="bordered">Bordered</bit-button>
<bit-button variant="outline">Outline</bit-button>
<bit-button variant="ghost">Ghost</bit-button>
<bit-button variant="text">Text</bit-button>
```

</ComponentPreview>

**Use cases:**

- **Solid**: Primary call-to-action buttons
- **Flat/Bordered**: Secondary actions
- **Outline**: Tertiary actions, alternative styling
- **Ghost/Text**: Minimal emphasis, inline actions

## Colors

Five semantic colors for different contexts:

<ComponentPreview>

```html
<bit-button color="primary">Primary</bit-button>
<bit-button color="secondary">Secondary</bit-button>
<bit-button color="success">Success</bit-button>
<bit-button color="warning">Warning</bit-button>
<bit-button color="error">Error</bit-button>
```

</ComponentPreview>

## Sizes

Three sizes for different contexts:

<ComponentPreview center>

```html
<bit-button size="sm">Small</bit-button>
<bit-button size="md">Medium</bit-button>
<bit-button size="lg">Large</bit-button>
```

</ComponentPreview>

## With Icons

Add prefix or suffix icons using slots:

<ComponentPreview>

```html
<bit-button>
  <span slot="prefix">←</span>
  Back
</bit-button>
<bit-button variant="outline" color="success">
  Save
  <span slot="suffix">💾</span>
</bit-button>
<bit-button icon-only aria-label="Delete" color="error"> 🗑️ </bit-button>
```

</ComponentPreview>

::: warning Accessibility
Icon-only buttons **must** include an `aria-label` attribute for screen readers.
:::

## States

### Loading

Show a loading spinner and prevent interaction:

<ComponentPreview>

```html
<bit-button loading>Loading...</bit-button>
```

</ComponentPreview>

### Disabled

Prevent interaction and reduce opacity:

<ComponentPreview>

```html
<bit-button disabled>Disabled</bit-button>
```

</ComponentPreview>

## Rounded

Fully rounded corners for a pill-shaped appearance:

<ComponentPreview>

```html
<bit-button rounded>Rounded</bit-button>
<bit-button rounded size="lg">Large Rounded</bit-button>
<bit-button rounded icon-only aria-label="Check"> ✓ </bit-button>
```

</ComponentPreview>

## Form Integration

Buttons work seamlessly with native HTML forms:

<ComponentPreview>

```html
<form style="display: flex; gap: 0.75rem;" onsubmit="event.preventDefault(); alert('Form submitted!')">
  <bit-button type="submit">Submit</bit-button>
  <bit-button type="reset" variant="outline" color="error">Reset</bit-button>
  <bit-button type="button" variant="ghost" color="secondary">Cancel</bit-button>
</form>
```

</ComponentPreview>

**Button types:**

- `type="submit"` - Submits the form
- `type="reset"` - Resets form fields
- `type="button"` - No default behavior (default outside forms)

## Custom Styling

Customize appearance using CSS custom properties:

<ComponentPreview>

```html
<bit-button
  style="--button-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%); --button-hover-bg: linear-gradient(135deg, #764ba2 0%, #667eea 100%); --button-color: white; --button-radius: 20px;">
  Custom Gradient
</bit-button>
<bit-button
  style="--button-bg: #ff6b6b; --button-color: white; --button-padding: 0.75rem 2rem; --button-font-weight: 700;">
  Custom Style
</bit-button>
```

</ComponentPreview>

### Available CSS Custom Properties

#### Colors & Backgrounds

- `--button-bg` - Background color
- `--button-color` - Text color
- `--button-hover-bg` - Hover background
- `--button-active-bg` - Active/pressed background

#### Borders & Spacing

- `--button-border` - Border (width, style, color)
- `--button-radius` - Border radius
- `--button-padding` - Inner padding
- `--button-gap` - Gap between icon and text

#### Typography

- `--button-font-size` - Font size
- `--button-font-weight` - Font weight

## API Reference

### Attributes

| Attribute   | Type                                                                | Default     | Description                      |
| ----------- | ------------------------------------------------------------------- | ----------- | -------------------------------- |
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'` | `'solid'`   | Visual style variant             |
| `color`     | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'`     | `'primary'` | Semantic color                   |
| `size`      | `'sm' \| 'md' \| 'lg'`                                              | `'md'`      | Button size                      |
| `type`      | `'button' \| 'submit' \| 'reset'`                                   | `'button'`  | Button type (for forms)          |
| `disabled`  | `boolean`                                                           | `false`     | Disable the button               |
| `loading`   | `boolean`                                                           | `false`     | Show loading state               |
| `icon-only` | `boolean`                                                           | `false`     | Icon-only mode (smaller padding) |
| `rounded`   | `boolean`                                                           | `false`     | Fully rounded corners            |

### Slots

| Slot      | Description                        |
| --------- | ---------------------------------- |
| (default) | Button content (text, icons, etc.) |
| `prefix`  | Content before the main content    |
| `suffix`  | Content after the main content     |

### Events

| Event   | Detail                          | Description                                              |
| ------- | ------------------------------- | -------------------------------------------------------- |
| `click` | `{ originalEvent: MouseEvent }` | Emitted when button is clicked (if not disabled/loading) |

## Accessibility

The button component follows WAI-ARIA best practices:

✅ **Keyboard Navigation**

- `Enter` and `Space` activate the button
- `Tab` moves focus to/from the button

✅ **Screen Readers**

- Announces button role and label
- `aria-disabled` when disabled
- `aria-busy` when loading
- Icon-only buttons require `aria-label`

✅ **Focus Management**

- Visible focus indicators
- Focus is not trapped when disabled

### Best Practices

**Do:**

- Use semantic colors to communicate intent
- Provide `aria-label` for icon-only buttons
- Use loading state for async operations
- Use appropriate `type` in forms

**Don't:**

- Use multiple primary buttons in the same context
- Rely solely on color to communicate meaning
- Use icon-only buttons without labels
- Nest interactive elements inside buttons

## Browser Support

Requires modern browsers with Web Components support:

- Chrome 77+
- Firefox 93+
- Safari 16.4+
- Edge 79+

## Related Components

- **Button Group** - Group multiple buttons together (coming soon)
- **Split Button** - Button with a dropdown menu (coming soon)

## Source Code

- [Button Component](https://github.com/helmuthdu/vielzeug/tree/main/components/src/base/button)
- [Tests](https://github.com/helmuthdu/vielzeug/tree/main/components/src/base/button/__tests__)
