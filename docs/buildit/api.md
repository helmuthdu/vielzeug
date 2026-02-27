## Component Import Paths

All components are available as modular imports:

```typescript
import '@vielzeug/buildit/accordion';
import '@vielzeug/buildit/accordion-item';
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/button-group';
import '@vielzeug/buildit/card';
import '@vielzeug/buildit/checkbox';
import '@vielzeug/buildit/input';
import '@vielzeug/buildit/radio';
import '@vielzeug/buildit/switch';
import '@vielzeug/buildit/text';
```

## Button Component

### Tag Name

`<bit-button>`

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

### CSS Custom Properties

Refer to the component source for a full list of overridable CSS variables.

## Card Component

### Tag Name

`<bit-card>`

### Attributes

| Attribute   | Type                                                                           | Default   | Description                               |
| ----------- | ------------------------------------------------------------------------------ | --------- | ----------------------------------------- |
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | `'solid'` | Visual style variant                      |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg'`                                               | `'md'`    | Internal padding size                     |
| `hoverable` | `boolean`                                                                      | `false`   | Enable hover effect with lift animation   |
| `clickable` | `boolean`                                                                      | `false`   | Make card clickable and emit click events |

### Slots

| Slot      | Description                              |
| --------- | ---------------------------------------- |
| (default) | Main content area of the card            |
| `header`  | Header section at the top of the card    |
| `footer`  | Footer section at the bottom of the card |

### Events

| Event   | Detail                     | Description                            |
| ------- | -------------------------- | -------------------------------------- |
| `click` | `{ originalEvent: Event }` | Emitted when clickable card is clicked |

### CSS Custom Properties

| Property              | Default                     | Description          |
| --------------------- | --------------------------- | -------------------- |
| `--card-bg`           | `var(--color-contrast-50)`  | Background color     |
| `--card-color`        | `var(--color-contrast-900)` | Text color           |
| `--card-border`       | `var(--border)`             | Border width         |
| `--card-border-color` | `var(--color-contrast-200)` | Border color         |
| `--card-radius`       | `var(--rounded-lg)`         | Border radius        |
| `--card-padding`      | `var(--size-4)`             | Internal padding     |
| `--card-shadow`       | `var(--shadow-sm)`          | Box shadow           |
| `--card-hover-shadow` | `var(--shadow-md)`          | Hover state shadow   |
| `--card-gap`          | `var(--size-3)`             | Gap between sections |

## Accordion Component

### Tag Names

- `<bit-accordion>` - Container for accordion items
- `<bit-accordion-item>` - Individual collapsible item

### bit-accordion Attributes

| Attribute        | Type                                                                           | Default      | Description                                   |
| ---------------- | ------------------------------------------------------------------------------ | ------------ | --------------------------------------------- |
| `selection-mode` | `'single' \| 'multiple'`                                                       | `'multiple'` | Selection mode                                |
| `variant`        | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | -            | Visual style variant (propagated to children) |
| `size`           | `'sm' \| 'md' \| 'lg'`                                                         | `'md'`       | Size (propagated to children)                 |

### bit-accordion-item Attributes

| Attribute  | Type                                                                           | Default | Description                  |
| ---------- | ------------------------------------------------------------------------------ | ------- | ---------------------------- |
| `expanded` | `boolean`                                                                      | `false` | Whether the item is expanded |
| `disabled` | `boolean`                                                                      | `false` | Disable the accordion item   |
| `variant`  | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | -       | Visual style variant         |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                         | `'md'`  | Item size                    |

### Slots

#### bit-accordion

| Slot      | Description                                     |
| --------- | ----------------------------------------------- |
| (default) | Accordion items (`bit-accordion-item` elements) |

#### bit-accordion-item

| Slot       | Description                         |
| ---------- | ----------------------------------- |
| `title`    | Title/summary content               |
| `subtitle` | Subtitle text shown below the title |
| `prefix`   | Content before the header content   |
| `suffix`   | Content after the header content    |
| (default)  | Content shown when expanded         |

### Events

#### bit-accordion

| Event    | Detail                                  | Description                                       |
| -------- | --------------------------------------- | ------------------------------------------------- |
| `change` | `{ expandedItem: HTMLElement \| null }` | Emitted when selection changes (single mode only) |

#### bit-accordion-item

| Event      | Detail                                   | Description                    |
| ---------- | ---------------------------------------- | ------------------------------ |
| `expand`   | `{ expanded: true, item: HTMLElement }`  | Emitted when item is expanded  |
| `collapse` | `{ expanded: false, item: HTMLElement }` | Emitted when item is collapsed |

## Text Component

### Tag Name

`<bit-text>`

### Attributes

| Attribute  | Type                                                                                                            | Default  | Description                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------- |
| `variant`  | `'body' \| 'heading' \| 'label' \| 'caption' \| 'overline' \| 'code'`                                           | `'body'` | Text variant style                          |
| `size`     | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| '4xl' \| '5xl' \| '6xl' \| '7xl' \| '8xl' \| '9xl'`  | -        | Text size (13 options from 12px to 128px)   |
| `weight`   | `'normal' \| 'medium' \| 'semibold' \| 'bold'`                                                                  | -        | Font weight                                 |
| `color`    | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'heading' \| 'body' \| 'muted' \| 'disabled'` | -        | Text color                                  |
| `align`    | `'left' \| 'center' \| 'right' \| 'justify'`                                                                    | -        | Text alignment                              |
| `truncate` | `boolean`                                                                                                       | `false`  | Enable single-line truncation with ellipsis |
| `italic`   | `boolean`                                                                                                       | `false`  | Apply italic font style                     |
| `as`       | `'span' \| 'p' \| 'div' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'label' \| 'code'`                   | -        | Semantic HTML tag to render                 |

### Slots

| Slot      | Description  |
| --------- | ------------ |
| (default) | Text content |

### CSS Custom Properties

| Property                | Description    | Default                  |
| ----------------------- | -------------- | ------------------------ |
| `--text-size`           | Font size      | `var(--text-base)`       |
| `--text-weight`         | Font weight    | `var(--font-normal)`     |
| `--text-color`          | Text color     | `var(--text-color-body)` |
| `--text-line-height`    | Line height    | `var(--leading-normal)`  |
| `--text-letter-spacing` | Letter spacing | `normal`                 |

### Usage Examples

#### Basic Text

```html
<bit-text>Regular paragraph text</bit-text>
```

#### Heading Variants

```html
<bit-text variant="heading" size="3xl" as="h1">Page Title</bit-text>
<bit-text variant="heading" size="2xl" as="h2">Section Title</bit-text>
```

#### Colored Text

```html
<bit-text color="primary">Primary colored text</bit-text>
<bit-text color="error" weight="medium">Error message</bit-text>
<bit-text color="muted" size="sm">Secondary information</bit-text>
```

#### Truncated Text

```html
<bit-text truncate style="max-width: 200px;"> This long text will be truncated with ellipsis... </bit-text>
```

## Checkbox Component

### Tag Name

`<bit-checkbox>`

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

### Events

| Event    | Detail                                                              | Description                        |
| -------- | ------------------------------------------------------------------- | ---------------------------------- |
| `change` | `{ checked: boolean, value: string \| null, originalEvent: Event }` | Emitted when checked state changes |

## Switch Component

### Tag Name

`<bit-switch>`

### Attributes

| Attribute  | Type                                                            | Default     | Description              |
| ---------- | --------------------------------------------------------------- | ----------- | ------------------------ |
| `checked`  | `boolean`                                                       | `false`     | Switch checked state     |
| `disabled` | `boolean`                                                       | `false`     | Disable the switch       |
| `color`    | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error'` | `'primary'` | Semantic color           |
| `size`     | `'sm' \| 'md' \| 'lg'`                                          | `'md'`      | Switch size              |
| `name`     | `string`                                                        | -           | Form field name          |
| `value`    | `string`                                                        | -           | Form field value when on |

### Slots

| Slot      | Description          |
| --------- | -------------------- |
| (default) | Switch label content |

### Events

| Event    | Detail                                                              | Description                        |
| -------- | ------------------------------------------------------------------- | ---------------------------------- |
| `change` | `{ checked: boolean, value: string \| null, originalEvent: Event }` | Emitted when checked state changes |

### CSS Custom Properties

| Property             | Description                   | Default                |
| -------------------- | ----------------------------- | ---------------------- |
| `--switch-width`     | Width of the switch track     | Size-dependent         |
| `--switch-height`    | Height of the switch track    | Size-dependent         |
| `--switch-bg`        | Background when checked       | Color-dependent        |
| `--switch-track`  | Background of unchecked track | `--color-contrast-300` |
| `--switch-thumb`  | Background of the thumb       | `white`                |
| `--switch-font-size` | Font size of the label        | Size-dependent         |

### CSS Custom Properties

#### bit-accordion

| Property          | Description                 | Default  |
| ----------------- | --------------------------- | -------- |
| `--accordion-gap` | Gap between accordion items | `0.5rem` |

#### bit-accordion-item

| Property                          | Description         | Default                 |
| --------------------------------- | ------------------- | ----------------------- |
| `--accordion-item-bg`             | Background color    | `transparent`           |
| `--accordion-item-color`          | Text color          | `var(--color-contrast)` |
| `--accordion-item-border-color`   | Border color        | `var(--color-backdrop)` |
| `--accordion-item-radius`         | Border radius       | `0.375rem`              |
| `--accordion-item-padding`        | Content padding     | Size-dependent          |
| `--accordion-item-header-padding` | Header padding      | Size-dependent          |
| `--accordion-item-font-size`      | Font size           | Size-dependent          |
| `--accordion-item-transition`     | Transition duration | `200ms ease-in-out`     |

### Examples

#### Basic Accordion

```html
<bit-accordion>
  <bit-accordion-item>
    <span slot="header">Section 1</span>
    <p>Content for section 1</p>
  </bit-accordion-item>
  <bit-accordion-item>
    <span slot="header">Section 2</span>
    <p>Content for section 2</p>
  </bit-accordion-item>
</bit-accordion>
```

#### Multiple Expand Mode

```html
<bit-accordion allow-multiple>
  <bit-accordion-item expanded>
    <span slot="header">Item 1</span>
    <p>This item is expanded</p>
  </bit-accordion-item>
  <bit-accordion-item expanded>
    <span slot="header">Item 2</span>
    <p>This item is also expanded</p>
  </bit-accordion-item>
</bit-accordion>
```

#### With Variants and Sizes

```html
<bit-accordion variant="bordered" size="lg">
  <bit-accordion-item>
    <span slot="header">Large Bordered Item</span>
    <p>Content with borders and large padding</p>
  </bit-accordion-item>
</bit-accordion>
```

#### Custom Icon

```html
<bit-accordion>
  <bit-accordion-item>
    <span slot="header">Custom Icon</span>
    <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 18l6-6-6-6" />
    </svg>
    <p>Content with custom chevron</p>
  </bit-accordion-item>
</bit-accordion>
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
const bgColor = getComputedStyle(button).getPropertyValue('--button-bg');

// Set custom property
button.style.setProperty('--button-bg', '#3b82f6');
button.style.setProperty('--button-color', 'white');
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
| ------- | --------------- |
| Chrome  | 77+             |
| Firefox | 93+             |
| Safari  | 16.4+           |
| Edge    | 79+             |

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

| Component | Size        |
| --------- | ----------- |
| Button    | ~6.8 KB     |
| Input     | Coming soon |
| Select    | Coming soon |

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
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      loadButton();
    }
  });
});
```

## Next Steps

- **[Usage Guide](./usage.md)** – Installation and usage patterns
- **[Examples](./examples.md)** – Real-world examples
- **[Button Component](components/button.md)** – Complete button documentation
