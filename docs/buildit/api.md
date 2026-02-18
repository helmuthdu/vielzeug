# API Reference

Complete API documentation for all Buildit components and utilities.

## Component Import Paths

All components are available as modular imports:

```typescript
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';    // Coming soon
import '@vielzeug/buildit/select';   // Coming soon
import '@vielzeug/buildit/checkbox'; // Coming soon
```

## Button Component

### Tag Name

`<bit-button>`

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

### CSS Custom Properties

#### Colors & Backgrounds

| Property | Description | Default |
|----------|-------------|---------|
| `--btn-bg` | Background color | Variant-dependent |
| `--btn-color` | Text color | Variant-dependent |
| `--btn-hover-bg` | Hover background | Variant-dependent |
| `--btn-active-bg` | Active/pressed background | Variant-dependent |
| `--btn-base` | Base color from theme | Theme color |
| `--btn-contrast` | Contrast color | Theme contrast |
| `--btn-backdrop` | Backdrop color (subtle) | Theme backdrop |
| `--btn-focus` | Focus state color | Theme focus |

#### Borders & Spacing

| Property | Description | Default |
|----------|-------------|---------|
| `--btn-border` | Border (width, style, color) | `1px solid transparent` |
| `--btn-radius` | Border radius | `0.375rem` |
| `--btn-padding` | Inner padding | Size-dependent |
| `--btn-gap` | Gap between icon and text | `0.5rem` |

#### Typography

| Property | Description | Default |
|----------|-------------|---------|
| `--btn-font-size` | Font size | Size-dependent |
| `--btn-font-weight` | Font weight | `500` |
| `--btn-line-height` | Line height | `1.5` |

#### Effects

| Property | Description | Default |
|----------|-------------|---------|
| `--btn-shadow` | Box shadow | None |
| `--btn-transition` | Transition duration | `0.2s` |

### Examples

#### Basic Button

```html
<bit-button>Click me</bit-button>
```

#### Variant Examples

```html
<bit-button variant="solid">Solid</bit-button>
<bit-button variant="flat">Flat</bit-button>
<bit-button variant="bordered">Bordered</bit-button>
<bit-button variant="outline">Outline</bit-button>
<bit-button variant="ghost">Ghost</bit-button>
<bit-button variant="text">Text</bit-button>
```

#### Color Examples

```html
<bit-button color="primary">Primary</bit-button>
<bit-button color="secondary">Secondary</bit-button>
<bit-button color="success">Success</bit-button>
<bit-button color="warning">Warning</bit-button>
<bit-button color="error">Error</bit-button>
```

#### Size Examples

```html
<bit-button size="sm">Small</bit-button>
<bit-button size="md">Medium</bit-button>
<bit-button size="lg">Large</bit-button>
```

#### State Examples

```html
<bit-button disabled>Disabled</bit-button>
<bit-button loading>Loading...</bit-button>
```

#### Icon Examples

```html
<!-- With prefix icon -->
<bit-button>
  <svg slot="prefix" width="16" height="16">...</svg>
  Save
</bit-button>

<!-- With suffix icon -->
<bit-button>
  Next
  <svg slot="suffix" width="16" height="16">...</svg>
</bit-button>

<!-- Icon only -->
<bit-button icon-only aria-label="Settings">
  <svg width="20" height="20">...</svg>
</bit-button>
```

#### Custom Styling

```html
<bit-button
  style="
    --btn-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --btn-hover-bg: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    --btn-color: white;
    --btn-radius: 20px;
    --btn-padding: 0.75rem 2rem;
  ">
  Custom Gradient
</bit-button>
```

## Theme Variables

Global theme variables that affect all components:

### Color Palette

```css
:root {
  /* Primary colors */
  --color-primary: #3b82f6;
  --color-primary-light: #60a5fa;
  --color-primary-dark: #2563eb;
  
  /* Secondary colors */
  --color-secondary: #6b7280;
  --color-secondary-light: #9ca3af;
  --color-secondary-dark: #4b5563;
  
  /* Semantic colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Neutral colors */
  --color-canvas: #ffffff;
  --color-contrast: #1f2937;
  --color-backdrop: #f3f4f6;
  --color-focus: #3b82f6;
}

.dark-theme {
  --color-primary: #60a5fa;
  --color-primary-light: #93c5fd;
  --color-primary-dark: #3b82f6;
  
  --color-secondary: #9ca3af;
  --color-secondary-light: #d1d5db;
  --color-secondary-dark: #6b7280;
  
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  
  --color-canvas: #111827;
  --color-contrast: #f9fafb;
  --color-backdrop: #1f2937;
  --color-focus: #60a5fa;
}
```

### Spacing

```css
:root {
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```

### Typography

```css
:root {
  --font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}
```

### Borders

```css
:root {
  --border-width: 1px;
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.375rem;
  --border-radius-lg: 0.5rem;
  --border-radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

## Utilities

### Theme Control

Control the theme programmatically:

```typescript
// Set theme
document.documentElement.classList.add('dark-theme');
document.documentElement.classList.remove('light-theme');

// Toggle theme
document.documentElement.classList.toggle('dark-theme');

// Detect system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (e.matches) {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
});
```

### Custom Properties Helper

Get and set custom properties:

```typescript
// Get custom property value
const button = document.querySelector('bit-button');
const bgColor = getComputedStyle(button).getPropertyValue('--btn-bg');

// Set custom property
button.style.setProperty('--btn-bg', '#3b82f6');
button.style.setProperty('--btn-color', 'white');
```

## Type Definitions

### Button Types

```typescript
type ButtonVariant = 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text';
type ButtonColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonType = 'button' | 'submit' | 'reset';

interface ButtonElement extends HTMLElement {
  variant: ButtonVariant;
  color: ButtonColor;
  size: ButtonSize;
  type: ButtonType;
  disabled: boolean;
  loading: boolean;
  iconOnly: boolean;
  rounded: boolean;
}

interface ButtonClickEvent extends CustomEvent {
  detail: {
    originalEvent: MouseEvent;
  };
}
```

### Global Types

For better TypeScript support in JSX/TSX:

```typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'bit-button': {
        variant?: ButtonVariant;
        color?: ButtonColor;
        size?: ButtonSize;
        type?: ButtonType;
        disabled?: boolean;
        loading?: boolean;
        'icon-only'?: boolean;
        rounded?: boolean;
        'aria-label'?: string;
        style?: string;
        class?: string;
        onClick?: (event: ButtonClickEvent) => void;
      };
    }
  }
}
```

## Browser Compatibility

### Supported Browsers

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 77+ |
| Firefox | 93+ |
| Safari | 16.4+ |
| Edge | 79+ |

### Required Features

Buildit requires the following web platform features:

- **Custom Elements v1** – For component registration
- **Shadow DOM v1** – For style encapsulation
- **ES Modules** – For component loading
- **CSS Custom Properties** – For theming

### Polyfills

For older browsers, use [@webcomponents/webcomponentsjs](https://github.com/webcomponents/polyfills):

```html
<script src="https://unpkg.com/@webcomponents/webcomponentsjs@latest/webcomponents-loader.js"></script>
<script type="module">
  import '@vielzeug/buildit/button';
</script>
```

## Performance

### Bundle Size

Component sizes (minified + gzipped):

| Component | Size |
|-----------|------|
| Button | ~6.8 KB |
| Input | Coming soon |
| Select | Coming soon |

### Tree Shaking

Buildit supports tree-shaking. Import only what you need:

```typescript
// ✅ Only button code is included
import '@vielzeug/buildit/button';

// ❌ Don't do this (no tree-shaking benefit)
import * as Buildit from '@vielzeug/buildit';
```

### Lazy Loading

Lazy load components for better performance:

```typescript
// Load button only when needed
async function loadButton() {
  await import('@vielzeug/buildit/button');
}

// Use with intersection observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadButton();
    }
  });
});
```

## Next Steps

- **[Usage Guide](./usage.md)** – Installation and usage patterns
- **[Examples](./examples.md)** – Real-world examples
- **[Button Component](./button.md)** – Complete button documentation

