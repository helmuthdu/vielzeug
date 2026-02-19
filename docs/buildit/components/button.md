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

<ClientOnly>
  <div class="demo-container">
    <bit-button variant="solid">Solid</bit-button>
    <bit-button variant="flat">Flat</bit-button>
    <bit-button variant="bordered">Bordered</bit-button>
    <bit-button variant="outline">Outline</bit-button>
    <bit-button variant="ghost">Ghost</bit-button>
    <bit-button variant="text">Text</bit-button>
  </div>
</ClientOnly>

```html
<bit-button variant="solid">Solid</bit-button>
<bit-button variant="flat">Flat</bit-button>
<bit-button variant="bordered">Bordered</bit-button>
<bit-button variant="outline">Outline</bit-button>
<bit-button variant="ghost">Ghost</bit-button>
<bit-button variant="text">Text</bit-button>
```

**Use cases:**
- **Solid**: Primary call-to-action buttons
- **Flat/Bordered**: Secondary actions
- **Outline**: Tertiary actions, alternative styling
- **Ghost/Text**: Minimal emphasis, inline actions

## Colors

Five semantic colors for different contexts:

<ClientOnly>
  <div class="demo-container">
    <bit-button color="primary">Primary</bit-button>
    <bit-button color="secondary">Secondary</bit-button>
    <bit-button color="success">Success</bit-button>
    <bit-button color="warning">Warning</bit-button>
    <bit-button color="error">Error</bit-button>
  </div>
</ClientOnly>

```html
<bit-button color="primary">Primary</bit-button>
<bit-button color="secondary">Secondary</bit-button>
<bit-button color="success">Success</bit-button>
<bit-button color="warning">Warning</bit-button>
<bit-button color="error">Error</bit-button>
```

## Sizes

Three sizes for different contexts:

<ClientOnly>
  <div class="demo-container">
    <bit-button size="sm">Small</bit-button>
    <bit-button size="md">Medium</bit-button>
    <bit-button size="lg">Large</bit-button>
  </div>
</ClientOnly>

```html
<bit-button size="sm">Small</bit-button>
<bit-button size="md">Medium</bit-button>
<bit-button size="lg">Large</bit-button>
```

## With Icons

Add prefix or suffix icons using slots:

<ClientOnly>
  <div class="demo-container">
    <bit-button>
      <span slot="prefix" class="material-symbols-rounded">arrow_back</span>
      Back
    </bit-button>
    <bit-button variant="outline" color="success">
      Save
      <span slot="suffix" class="material-symbols-rounded">save</span>
    </bit-button>
    <bit-button icon-only aria-label="Settings" color="error">
      <span class="material-symbols-rounded">delete</span>
    </bit-button>
  </div>
</ClientOnly>

```html
<!-- With prefix icon -->
<bit-button>
  <svg slot="prefix">...</svg>
  Next
</bit-button>

<!-- With suffix icon -->
<bit-button>
  Save
  <svg slot="suffix">...</svg>
</bit-button>

<!-- Icon-only (must have aria-label) -->
<bit-button icon-only aria-label="Delete">
  <svg>...</svg>
</bit-button>
```

::: warning Accessibility
Icon-only buttons **must** include an `aria-label` attribute for screen readers.
:::

## States

### Loading

Show a loading spinner and prevent interaction:

<ClientOnly>
  <div class="demo-container">
    <bit-button loading>Loading...</bit-button>
  </div>
</ClientOnly>

```html
<bit-button loading>Loading...</bit-button>
```

### Disabled

Prevent interaction and reduce opacity:

<ClientOnly>
  <div class="demo-container">
    <bit-button disabled>Disabled</bit-button>
  </div>
</ClientOnly>

```html
<bit-button disabled>Disabled</bit-button>
```

## Rounded

Fully rounded corners for a pill-shaped appearance:

<ClientOnly>
  <div class="demo-container">
    <bit-button rounded>Rounded</bit-button>
    <bit-button rounded size="lg">Large Rounded</bit-button>
    <bit-button rounded icon-only aria-label="Circle">
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
        <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
      </svg>
    </bit-button>
  </div>
</ClientOnly>

```html
<bit-button rounded>Rounded</bit-button>
<bit-button rounded icon-only aria-label="Circle">...</bit-button>
```

## Form Integration

Buttons work seamlessly with native HTML forms:

<ClientOnly>
  <div class="demo-container">
    <form style="display: flex; gap: 0.75rem;" onsubmit="event.preventDefault(); alert('Form submitted!')">
      <bit-button type="submit">Submit</bit-button>
      <bit-button type="reset" variant="outline" color="error">Reset</bit-button>
      <bit-button type="button" variant="ghost" color="secondary">Cancel</bit-button>
    </form>
  </div>
</ClientOnly>

```html
<form>
  <bit-button type="submit">Submit</bit-button>
  <bit-button type="reset" variant="outline" color="error">Reset</bit-button>
  <bit-button type="button" variant="ghost" color="secondary">Cancel</bit-button>
</form>
```

**Button types:**
- `type="submit"` - Submits the form
- `type="reset"` - Resets form fields
- `type="button"` - No default behavior (default outside forms)

## Custom Styling

Customize appearance using CSS custom properties:

<ClientOnly>
  <div class="demo-container">
    <bit-button style="--button-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%); --button-hover-bg: linear-gradient(135deg, #764ba2 0%, #667eea 100%); --button-color: white; --button-radius: 20px;">
      Custom Gradient
    </bit-button>
    <bit-button style="--button-bg: #ff6b6b; --button-color: white; --button-padding: 0.75rem 2rem; --button-font-weight: 700;">
      Custom Style
    </bit-button>
  </div>
</ClientOnly>

```html
<bit-button 
  style="
    --button-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --button-hover-bg: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    --button-color: white;
    --button-radius: 20px;
  ">
  Custom Gradient
</bit-button>
```

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

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text'` | `'solid'` | Visual style variant |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type (for forms) |
| `disabled` | `boolean` | `false` | Disable the button |
| `loading` | `boolean` | `false` | Show loading state |
| `icon-only` | `boolean` | `false` | Icon-only mode (smaller padding) |
| `rounded` | `boolean` | `false` | Fully rounded corners |

### Slots

| Slot | Description |
|------|-------------|
| (default) | Button content (text, icons, etc.) |
| `prefix` | Content before the main content |
| `suffix` | Content after the main content |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
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

## Examples

### Form Actions

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; gap: 0.75rem;">
      <bit-button color="success">Save</bit-button>
      <bit-button variant="outline" color="secondary">Cancel</bit-button>
      <bit-button variant="ghost" color="error">Delete</bit-button>
    </div>
  </div>
</ClientOnly>

```html
<bit-button color="success">Save</bit-button>
<bit-button variant="outline" color="secondary">Cancel</bit-button>
<bit-button variant="ghost" color="error">Delete</bit-button>
```

### Navigation

<ClientOnly>
  <div class="demo-container">
    <div style="display: flex; gap: 0.75rem;">
      <bit-button variant="ghost" size="sm">← Back</bit-button>
      <bit-button variant="ghost" size="sm">Next →</bit-button>
    </div>
  </div>
</ClientOnly>

```html
<bit-button variant="ghost" size="sm">← Back</bit-button>
<bit-button variant="ghost" size="sm">Next →</bit-button>
```

### Call to Action

<ClientOnly>
  <div class="demo-container">
      <bit-button size="lg">Get Started</bit-button>
      <bit-button variant="text" size="lg">Learn More →</bit-button>
  </div>
</ClientOnly>

```html
<bit-button size="lg">Get Started</bit-button>
<bit-button variant="text" size="lg">Learn More →</bit-button>
```

## Related Components

- **Button Group** - Group multiple buttons together (coming soon)
- **Icon Button** - Specialized icon-only buttons (coming soon)
- **Split Button** - Button with dropdown menu (coming soon)

## Source Code

- [Button Component](https://github.com/helmuthdu/vielzeug/tree/main/components/src/base/button)
- [Tests](https://github.com/helmuthdu/vielzeug/tree/main/components/src/base/button/__tests__)

