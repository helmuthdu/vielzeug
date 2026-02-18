# Usage Guide

This guide covers installation, basic usage, and common patterns for using Buildit components in your applications.

## Installation

### Package Manager

Install Buildit using your preferred package manager:

::: code-group

```bash [pnpm]
pnpm add @vielzeug/buildit
```

```bash [npm]
npm install @vielzeug/buildit
```

```bash [yarn]
yarn add @vielzeug/buildit
```

:::

### CDN

For quick prototyping or static sites, you can use a CDN:

```html
<script type="module">
  import 'https://esm.sh/@vielzeug/buildit@latest/button';
</script>
```

::: warning
CDN imports are not recommended for production as they bypass your build process and tree-shaking.
:::

## Basic Usage

### Importing Components

Buildit uses modular imports for optimal tree-shaking. Import only the components you need:

```typescript
// Import specific components
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';  // Coming soon
import '@vielzeug/buildit/select'; // Coming soon
```

### Using Components

Once imported, components are available as custom elements:

```html
<bit-button>Click me</bit-button>
```

### Setting Attributes

Set attributes directly on the custom element:

```html
<bit-button 
  variant="outline" 
  color="secondary"
  size="lg"
  disabled>
  Large Outline Button
</bit-button>
```

### JavaScript API

Components can also be controlled via JavaScript:

```javascript
const button = document.querySelector('bit-button');

// Set attributes
button.setAttribute('variant', 'solid');
button.setAttribute('color', 'primary');

// Boolean attributes
button.toggleAttribute('disabled');
button.toggleAttribute('loading');

// Listen to events
button.addEventListener('click', (event) => {
  console.log('Button clicked!', event.detail);
});
```

## Framework Integration

### React

React works seamlessly with Web Components:

```tsx
import '@vielzeug/buildit/button';

function App() {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    // Perform async operation
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <bit-button
      variant="solid"
      color="primary"
      loading={loading}
      onClick={handleClick}>
      {loading ? 'Loading...' : 'Click me'}
    </bit-button>
  );
}
```

::: tip
For TypeScript users, you may need to add custom element types. Create a `custom-elements.d.ts` file:

```typescript
declare namespace JSX {
  interface IntrinsicElements {
    'bit-button': any;
  }
}
```
:::

### Vue

Vue has excellent Web Component support:

```vue
<template>
  <bit-button
    :variant="variant"
    :color="color"
    :loading="isLoading"
    @click="handleClick">
    {{ buttonText }}
  </bit-button>
</template>

<script setup>
import { ref } from 'vue';
import '@vielzeug/buildit/button';

const variant = ref('solid');
const color = ref('primary');
const isLoading = ref(false);
const buttonText = ref('Click me');

const handleClick = () => {
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
  }, 2000);
};
</script>
```

### Svelte

Svelte also works great with Web Components:

```svelte
<script>
  import '@vielzeug/buildit/button';
  
  let loading = false;
  
  function handleClick() {
    loading = true;
    setTimeout(() => {
      loading = false;
    }, 2000);
  }
</script>

<bit-button
  variant="solid"
  color="primary"
  loading={loading}
  on:click={handleClick}>
  {loading ? 'Loading...' : 'Click me'}
</bit-button>
```

### Angular

Angular requires a bit more configuration. Add `CUSTOM_ELEMENTS_SCHEMA` to your module:

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@vielzeug/buildit/button';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
```

Then use in templates:

```html
<bit-button
  [attr.variant]="'solid'"
  [attr.color]="'primary'"
  [attr.loading]="isLoading"
  (click)="handleClick()">
  {{ buttonText }}
</bit-button>
```

## Theming

### Light/Dark Mode

Buildit automatically detects system color scheme preferences:

```html
<!-- Automatically adapts to system preference -->
<bit-button>Auto Theme Button</bit-button>
```

### Manual Theme Control

Force a specific theme using CSS classes:

```html
<!-- Light theme -->
<html class="light-theme">
  <body>
    <bit-button>Light Button</bit-button>
  </body>
</html>

<!-- Dark theme -->
<html class="dark-theme">
  <body>
    <bit-button>Dark Button</bit-button>
  </body>
</html>
```

### Custom Theme Colors

Override theme colors using CSS variables:

```css
:root {
  /* Light theme */
  --color-primary: #3b82f6;
  --color-secondary: #6b7280;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}

.dark-theme {
  /* Dark theme */
  --color-primary: #60a5fa;
  --color-secondary: #9ca3af;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;
}
```

## Customization

### CSS Custom Properties

Every component exposes CSS custom properties for styling:

```html
<bit-button
  style="
    --btn-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --btn-color: white;
    --btn-hover-bg: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    --btn-radius: 20px;
    --btn-padding: 1rem 2rem;
  ">
  Custom Styled Button
</bit-button>
```

### Global Styling

Apply styles globally using CSS:

```css
bit-button {
  --btn-font-weight: 600;
  --btn-radius: 0.5rem;
}

/* Specific variant */
bit-button[variant="solid"] {
  --btn-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Specific color */
bit-button[color="primary"] {
  --btn-bg: #3b82f6;
}
```

## Advanced Patterns

### Dynamic Attributes

Update attributes dynamically based on state:

```typescript
const button = document.querySelector('bit-button');
let isProcessing = false;

button.addEventListener('click', async () => {
  if (isProcessing) return;
  
  isProcessing = true;
  button.setAttribute('loading', '');
  button.setAttribute('disabled', '');
  
  try {
    await performAsyncOperation();
  } finally {
    isProcessing = false;
    button.removeAttribute('loading');
    button.removeAttribute('disabled');
  }
});
```

### Form Integration

Components work seamlessly with native HTML forms:

```html
<form id="myForm">
  <input type="text" name="username" required>
  
  <bit-button type="submit" variant="solid" color="primary">
    Submit
  </bit-button>
  
  <bit-button type="reset" variant="outline" color="secondary">
    Reset
  </bit-button>
</form>

<script>
  document.getElementById('myForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    console.log(Object.fromEntries(formData));
  });
</script>
```

### Event Handling

Components emit custom events with detailed information:

```typescript
const button = document.querySelector('bit-button');

button.addEventListener('click', (event) => {
  // Access original event
  console.log('Original event:', event.detail.originalEvent);
  
  // Prevent default if needed
  event.preventDefault();
  
  // Stop propagation if needed
  event.stopPropagation();
});
```

### Slots and Icons

Use slots to add custom content like icons:

```html
<!-- With prefix icon -->
<bit-button variant="solid">
  <svg slot="prefix" width="16" height="16" fill="currentColor">
    <!-- SVG path -->
  </svg>
  Save
</bit-button>

<!-- With suffix icon -->
<bit-button variant="outline">
  Next
  <svg slot="suffix" width="16" height="16" fill="currentColor">
    <!-- SVG path -->
  </svg>
</bit-button>

<!-- Icon only (requires aria-label) -->
<bit-button icon-only aria-label="Settings">
  <svg width="20" height="20" fill="currentColor">
    <!-- SVG path -->
  </svg>
</bit-button>
```

## Best Practices

### Accessibility

Always provide accessible labels:

```html
<!-- Good: Text label -->
<bit-button>Save Changes</bit-button>

<!-- Good: Icon with aria-label -->
<bit-button icon-only aria-label="Save changes">
  <svg>...</svg>
</bit-button>

<!-- Bad: Icon without label -->
<bit-button icon-only>
  <svg>...</svg>
</bit-button>
```

### Performance

Import components only once per application:

```typescript
// ✅ Good - Import once at app entry
// main.ts
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';

// ❌ Bad - Importing in multiple files
// component-a.ts
import '@vielzeug/buildit/button';
// component-b.ts
import '@vielzeug/buildit/button';
```

### Semantic HTML

Use appropriate button types:

```html
<!-- Submit form -->
<bit-button type="submit">Submit</bit-button>

<!-- Reset form -->
<bit-button type="reset">Reset</bit-button>

<!-- Regular button (default) -->
<bit-button type="button">Click me</bit-button>
```

### Loading States

Show loading states for async operations:

```typescript
async function handleSubmit() {
  const button = document.querySelector('bit-button');
  
  button.setAttribute('loading', '');
  button.setAttribute('disabled', '');
  
  try {
    await submitForm();
  } catch (error) {
    console.error(error);
  } finally {
    button.removeAttribute('loading');
    button.removeAttribute('disabled');
  }
}
```

## TypeScript Support

### Type Definitions

Buildit provides full TypeScript support:

```typescript
import '@vielzeug/buildit/button';

// Element type
const button = document.querySelector('bit-button') as HTMLElement;

// Set attributes with type safety
button.setAttribute('variant', 'solid'); // ✅ Valid
button.setAttribute('variant', 'invalid'); // ⚠️ Works but not type-safe

// Event handling
button.addEventListener('click', (event: CustomEvent) => {
  console.log(event.detail.originalEvent);
});
```

### Custom Element Types

For better type safety, create type definitions:

```typescript
// types/buildit.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    'bit-button': {
      variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text';
      color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
      size?: 'sm' | 'md' | 'lg';
      disabled?: boolean;
      loading?: boolean;
      rounded?: boolean;
      'icon-only'?: boolean;
      type?: 'button' | 'submit' | 'reset';
    };
  }
}
```

## Migration Guide

### From Other Component Libraries

Buildit components are designed to coexist with other libraries. You can gradually migrate:

```html
<!-- Existing component -->
<button class="btn btn-primary">Old Button</button>

<!-- New Buildit component -->
<bit-button variant="solid" color="primary">New Button</bit-button>
```

Both can exist in the same application without conflicts.

## Troubleshooting

### Component Not Rendering

If components don't render, ensure you've imported them:

```typescript
// Make sure this line exists
import '@vielzeug/buildit/button';
```

### Styles Not Applying

Web Components use Shadow DOM. External CSS doesn't penetrate. Use CSS variables:

```css
/* ❌ Won't work */
bit-button button {
  background: red;
}

/* ✅ Works */
bit-button {
  --btn-bg: red;
}
```

### TypeScript Errors

Add DOM types to your tsconfig:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

## Next Steps

- **[API Reference](./api.md)** – Detailed API documentation
- **[Examples](./examples.md)** – Real-world usage examples
- **[Button Component](./button.md)** – Complete button documentation

