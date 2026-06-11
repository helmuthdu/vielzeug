---
title: Sigil — Usage Guide
description: Import patterns, slots, events, and accessibility for Sigil components.
---

[[toc]]

## Basic Usage

### Using Components

Once registered, components are available as custom elements:

```html
<sg-button>Click me</sg-button>
```

### Setting Attributes

Set attributes directly on the custom element:

```html
<sg-button variant="outline" color="secondary" size="lg" disabled> Large Outline Button </sg-button>
```

### Event Handling

Components emit DOM events. Many use familiar event names like `click`, `input`, `change`, `open`, and `close`. A few intentionally use namespaced custom events where collision avoidance matters, such as `sg-select` on `sg-menu`.

```javascript
const button = document.querySelector('sg-button');

button.addEventListener('click', () => {
  console.log('Button clicked');
});

const input = document.querySelector('sg-input');

input.addEventListener('change', (event) => {
  console.log('Input value:', event.detail.value);
});
```

Check the **[Framework Integration](./frameworks.md)** guide for framework-specific interop details.

## Slots

Sigil components use named and default slots for content projection. Slots let you pass arbitrary HTML — icons, text, other components — into designated regions of a component without JavaScript.

### Default Slot

Content placed directly inside the element fills the default slot:

```html
<sg-button>Save Changes</sg-button> <sg-card>Any HTML content here</sg-card>
```

### Named Slots

Components that have distinct regions expose them as named slots:

```html
<sg-card>
  <span slot="header">Card Heading</span>
  <p>Main card body content fills the default slot.</p>
  <div slot="footer">
    <sg-button size="sm" variant="outline">Cancel</sg-button>
    <sg-button size="sm">Confirm</sg-button>
  </div>
</sg-card>
```

### Icon Slots

Many interactive components expose leading or trailing content slots. For example, `sg-button` and `sg-input` use `prefix` and `suffix`:

```html
<sg-button>
  <svg slot="prefix" aria-hidden="true"><!-- ... --></svg>
  Submit
</sg-button>

<sg-input label="Search">
  <svg slot="suffix" aria-hidden="true"><!-- search icon --></svg>
</sg-input>
```

Slot availability varies by component; see the component pages in the Sigil sidebar and the **[API Reference](./api.md)** for the currently published surface.

## Accessibility

Sigil components are designed to meet **WCAG 2.1 AA** standards out-of-the-box. The key patterns are documented below.

### Keyboard Navigation

| Component type | Key                       | Behavior                                 |
| -------------- | ------------------------- | ---------------------------------------- |
| `sg-button`    | `Space` / `Enter`         | Activates the button                     |
| `sg-checkbox`  | `Space`                   | Toggles checked state                    |
| `sg-radio`     | `Arrow Up` / `Arrow Down` | Moves focus between options in the group |
| `sg-select`    | `Enter` / `Space`         | Opens/closes the listbox                 |
| `sg-select`    | `Arrow Up` / `Arrow Down` | Navigates options                        |
| `sg-accordion` | `Enter` / `Space`         | Expands/collapses panel                  |
| `sg-tabs`      | `Arrow Left` / `Right`    | Moves focus between tab triggers         |
| `sg-tooltip`   | `Escape`                  | Dismisses an open tooltip                |

### ARIA Attributes

Components manage their ARIA roles and states automatically. You can override specific attributes where needed:

```html
<!-- Custom label when visual label is not enough -->
<sg-button aria-label="Delete item">×</sg-button>

<!-- Associate an input with external help text -->
<sg-input label="Password" aria-describedby="pwd-hint" />
<p id="pwd-hint">Minimum 8 characters, one uppercase, one number.</p>
```

### Focus Management

- All interactive components participate in the native tab order.
- Use `disabled` to remove a component from the tab order. Disabled elements are not focusable.
- Modal-style overlays such as `sg-dialog` and `sg-drawer` manage focus entry and restoration automatically.

### Screen Readers

- Labels are connected to inputs via `aria-labelledby` internally.
- Loading and error states announce themselves with `aria-live` regions.
- Decorative icons should receive `aria-hidden="true"`; meaningful icons should have an `aria-label`.

## Framework Integration

Sigil components are standard custom elements and work anywhere custom elements are supported.

::: code-group

```tsx [React]
// React 19+ passes custom element props natively
import '@vielzeug/sigil/styles';
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';

function LoginForm() {
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    console.log(Object.fromEntries(data));
  };

  return (
    <sg-form onSubmit={handleSubmit}>
      <sg-input name="email" type="email" label="Email" required />
      <sg-button type="submit" color="primary" variant="solid">
        Log in
      </sg-button>
    </sg-form>
  );
}
```

```vue [Vue 3]
<!-- vite.config.ts: set compilerOptions.isCustomElement: tag => tag.startsWith('sg-') -->
<script setup lang="ts">
import '@vielzeug/sigil/styles';
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';

function handleChange(e: CustomEvent) {
  console.log(e.detail.value);
}
</script>

<template>
  <sg-form @submit.prevent="submit">
    <sg-input name="email" type="email" label="Email" required @change="handleChange" />
    <sg-button type="submit" color="primary" variant="solid">Log in</sg-button>
  </sg-form>
</template>
```

```svelte [Svelte]
<script>
  import '@vielzeug/sigil/styles';
  import '@vielzeug/sigil/button';
  import '@vielzeug/sigil/input';

  function handleChange(e) {
    console.log(e.detail.value);
  }
</script>

<sg-form on:submit|preventDefault={submit}>
  <sg-input name="email" type="email" label="Email" required on:change={handleChange} />
  <sg-button type="submit" color="primary" variant="solid">Log in</sg-button>
</sg-form>
```

:::

## Working with Other Vielzeug Libraries

**With Craft** — build custom components that compose Sigil elements:

```ts
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';
import { define } from '@vielzeug/craft';
import { html } from '@vielzeug/craft';
import { signal } from '@vielzeug/ripple';

define('my-search-bar', {
  setup() {
    const query = signal('');
    return html`
      <sg-input .value=${query} @input=${(e) => (query.value = e.detail.value)} label="Search" />
      <sg-button @click=${() => search(query.value)} variant="solid" color="primary">Search</sg-button>
    `;
  },
});
```

**With Ripple** — drive Sigil component state from reactive signals:

```ts
import { signal, effect } from '@vielzeug/ripple';

const isLoading = signal(false);
const btn = document.querySelector('sg-button');

effect(() => {
  btn.loading = isLoading.value;
});
```

## Best Practices

### Design Intensity

Use component variants to tune visual intensity without rebuilding layouts:

- `bolder`: Pair `solid` buttons with semantic colors and stronger elevation for one clear primary action.
- `quieter`: Use `ghost`, `text`, or `outline` variants for secondary actions and dense toolbars.
- `delight`: Add short, purposeful motion after meaningful events (save complete, invite sent), and always respect `prefers-reduced-motion`.
- `onboard`: Start with clear labels, helper text, and one recommended next action in empty states.

### 1. Import Global Styles First

Always import `@vielzeug/sigil/styles` before any component registration. Without it, components still render, but they will miss the intended token and base-style layer.

### 2. Use Named Component Imports for Tree-Shaking

```ts
// <sg-icon name="check" size="16"></sg-icon> registers only what you use
import '@vielzeug/sigil/button';
import '@vielzeug/sigil/input';

// <sg-icon name="x" size="16"></sg-icon> registers all components — larger bundle
import '@vielzeug/sigil';
```

### 3. Control Appearance with CSS Custom Properties

```css
sg-button {
  --button-radius: 4px;
  --button-font-size: 0.875rem;
}
```

### 4. Use Declarative Attributes Over JavaScript

```html
<!-- <sg-icon name="check" size="16"></sg-icon> prefer attribute-driven state -->
<sg-button loading disabled>Saving…</sg-button>

<!-- <sg-icon name="x" size="16"></sg-icon> avoid manual DOM manipulation when an attribute exists -->
<sg-button id="btn">Save</sg-button>
<script>
  document.getElementById('btn').setAttribute('loading', '');
</script>
```

### 5. Listen to Component Events

```js
const input = document.querySelector('sg-input');
input.addEventListener('change', (e) => console.log(e.detail.value));
```
