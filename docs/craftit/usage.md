# Craftit Usage Guide

Complete guide to using Craftit for creating type-safe, reactive web components.

::: tip 💡 Quick Reference
This guide covers detailed usage patterns. For complete examples, see [Examples](./examples.md). For API documentation, see [API Reference](./api.md).
:::

## Table of Contents

[[toc]]

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/craftit
```

```sh [npm]
npm install @vielzeug/craftit
```

```sh [yarn]
yarn add @vielzeug/craftit
```

:::

## Import

```ts
import { defineElement, html, css, classMap, styleMap, attach, destroy } from '@vielzeug/craftit';

// Optional: Import types
import type { WebComponent, ComponentOptions, Template } from '@vielzeug/craftit';
```

## Basic Usage

### Creating a Component

```ts
import { defineElement, html } from '@vielzeug/craftit';

defineElement('my-component', {
  template: html`
    <div class="container">
      <h1>Hello, Craftit!</h1>
    </div>
  `,
});

// Use in HTML
// <my-component></my-component>
```

### With State

```ts
defineElement('user-card', {
  state: {
    name: 'Alice',
    email: 'alice@example.com',
    isOnline: true,
  },

  template: (el) => html`
    <div class="user-card">
      <h2>${el.state.name}</h2>
      <p>${el.state.email}</p>
      <span class="status">${el.state.isOnline ? 'Online' : 'Offline'}</span>
    </div>
  `,
});
```

### Dynamic Templates

```ts
defineElement('product-list', {
  state: {
    products: [
      { id: 1, name: 'Product A', price: 29.99 },
      { id: 2, name: 'Product B', price: 39.99 },
    ],
  },

  template: (el) => html`
    <div class="products">
      ${el.state.products
        .map(
          (product) => `
        <div class="product" data-id="${product.id}">
          <h3>${product.name}</h3>
          <p>$${product.price.toFixed(2)}</p>
        </div>
      `,
        )
        .join('')}
    </div>
  `,
});
```

## Reactive State

### Direct Mutation

State changes automatically trigger re-renders:

```ts
defineElement('counter', {
  state: { count: 0 },

  template: (el) => html`
    <div>
      <p>Count: ${el.state.count}</p>
      <button class="increment">+</button>
    </div>
  `,

  onConnected(el) {
    el.on('.increment', 'click', () => {
      el.state.count++; // ✅ Automatic re-render
    });
  },
});
```

### Nested State

Nested objects and arrays are also reactive:

```ts
defineElement('todo-app', {
  state: {
    user: {
      name: 'Alice',
      preferences: {
        theme: 'dark',
      },
    },
    todos: [],
  },

  onConnected(el) {
    // Nested mutation
    el.state.user.preferences.theme = 'light'; // ✅ Re-renders

    // Array mutation
    el.state.todos.push({ id: 1, text: 'Learn Craftit' }); // ✅ Re-renders

    // Deep nesting
    el.state.user.preferences = { theme: 'auto' }; // ✅ Re-renders
  },
});
```

### Batch Updates with `set()`

Update multiple properties efficiently:

```ts
// Merge update
await el.set({ count: 10, name: 'New Name' });

// Replace entire state
await el.set({ count: 0 }, { replace: true });

// Updater function (sync)
await el.set((state) => ({
  ...state,
  count: state.count + 10,
}));

// Async updater
await el.set(async (state) => {
  const data = await fetch('/api/data').then((r) => r.json());
  return { ...state, data };
});

// Silent update (no re-render)
await el.set({ count: 10 }, { silent: true });
```

### Private State

Properties starting with `_` don't trigger re-renders:

```ts
defineElement('component', {
  state: {
    count: 0,
    _internalCache: {}, // Won't trigger re-renders
  },

  onConnected(el) {
    el.state._internalCache.data = 'cached'; // No re-render
    el.state.count++; // Re-renders
  },
});
```

## Styling

### Inline Styles

Use the `css` helper for type-safe CSS with JavaScript template literals:

```ts
import { defineElement, html, css } from '@vielzeug/craftit';

defineElement('styled-button', {
  template: html` <button>Click Me</button> `,

  styles: [
    css`
      button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
      }

      button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    `,
  ],
});
```

### CSS Variables (Custom Properties)

Craftit provides a powerful type-safe API for CSS variables with **automatic autocomplete**:

#### Single Theme with Autocomplete

The `css.theme()` function returns a **typed object** that provides both the CSS rule and typed variable references:

```ts
import { css } from '@vielzeug/craftit';

const theme = css.theme({
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  spacing: '1rem',
});

defineElement('app-component', {
  template: html`<div class="content">Hello</div>`,

  styles: [
    css`
      /* Inject CSS variables */
      ${theme}

      .content {
        /* ✨ Autocomplete works here! */
        background: ${theme.backgroundColor}; /* var(--background-color) */
        color: ${theme.textColor}; /* var(--text-color) */
        padding: ${theme.spacing}; /* var(--spacing) */
      }

      h1 {
        color: ${theme.primaryColor}; /* ✨ TypeScript knows all properties! */
      }
    `,
  ],
});
```

**Benefits:**

- ✅ **Autocomplete** – Type `theme.` and see all available variables
- ✅ **Type-safe** – Typos caught at compile time
- ✅ **Refactoring** – Rename variables safely across codebase
- ✅ **No string matching** – No more `css.var('primryColor')` bugs!

#### Light/Dark Theme with Autocomplete

Pass two theme objects to automatically create light/dark modes with `prefers-color-scheme`:

```ts
import { css } from '@vielzeug/craftit';

// Create light and dark themes
const theme = css.theme(
  // Light theme
  {
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderColor: '#e5e7eb',
  },
  // Dark theme
  {
    primaryColor: '#60a5fa',
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    borderColor: '#374151',
  },
);

defineElement('auto-theme-card', {
  template: html`<div class="card">Auto Dark Mode!</div>`,

  styles: [
    css`
      /* Inject light/dark themes with media queries */
      ${theme}

      .card {
        /* ✨ Same variable references – CSS handles which theme applies! */
        background: ${theme.backgroundColor};
        color: ${theme.textColor};
        border: 1px solid ${theme.borderColor};
      }

      h1 {
        color: ${theme.primaryColor};
      }
    `,
  ],
});
```

**How it works:**

- Automatically detects user's system preferences
- Manual override via `data-theme="light"` or `data-theme="dark"` attribute
- **Same variable references** for both themes – CSS does the work!

**Manual theme control:**

```ts
// Force dark mode
element.setAttribute('data-theme', 'dark');

// Force light mode
element.setAttribute('data-theme', 'light');

// Let system decide (remove manual override)
element.removeAttribute('data-theme');
```

#### Reference CSS Variables (Fallback)

You can still use `css.var()` for external variables or when you need fallbacks:

```ts
styles: [
  css`
    .button {
      /* For variables defined elsewhere */
      color: ${css.var('externalColor')};

      /* With fallback value */
      padding: ${css.var('spacing', '0.5rem')};
    }
  `,
];
```

#### Custom Selectors

You can scope themes to specific selectors:

```ts
// Single theme with custom selector
const theme = css.theme(
  {
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
  },
  undefined,
  { selector: '.custom' },
);

// Light/dark theme with custom selector
const theme = css.theme(
  { primaryColor: '#3b82f6', bg: '#fff' },
  { primaryColor: '#60a5fa', bg: '#000' },
  { selector: '.custom', attribute: 'theme' },
);
```

#### Complete Theming Example

```ts
import { defineElement, html, css } from '@vielzeug/craftit';

// Define your theme with full autocomplete
const appTheme = css.theme({
  // Colors
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',

  // Spacing
  spacing: '1rem',
  spacingSm: '0.5rem',
  spacingLg: '2rem',

  // Typography
  fontSize: '16px',
  fontFamily: 'system-ui, sans-serif',

  // Effects
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
});

defineElement('my-app', {
  template: (el) => html`
    <div class="container">
      <h1>Themed Component</h1>
      <button>Click Me</button>
    </div>
  `,

  styles: [
    css`
      ${appTheme}

      .container {
        font-family: ${appTheme.fontFamily};
        font-size: ${appTheme.fontSize};
        color: ${appTheme.textColor};
        background: ${appTheme.backgroundColor};
        padding: ${appTheme.spacing};
      }

      h1 {
        color: ${appTheme.primaryColor};
      }

      button {
        background: ${appTheme.secondaryColor};
        color: white;
        padding: ${appTheme.spacingSm} ${appTheme.spacing};
        border-radius: ${appTheme.borderRadius};
        box-shadow: ${appTheme.boxShadow};
      }
    `,
  ],
});
```

**What you get:**

- 🎯 **IDE autocomplete** for all theme properties
- 🔒 **Type safety** – compile-time error for typos
- 🔄 **Safe refactoring** – rename properties with confidence
- 📦 **Single import** – just `import { css }`

### CSSStyleSheet Objects

```ts
import { css } from '@vielzeug/craftit';

const sharedStyles = new CSSStyleSheet();
await sharedStyles.replace(css`
  .card {
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`);

defineElement('my-card', {
  template: html`<div class="card">Card Content</div>`,
  styles: [sharedStyles], // Reuse across components
});
```

### Dynamic Styles with `classMap` and `styleMap`

```ts
import { classMap, styleMap } from '@vielzeug/craftit';

defineElement('dynamic-styles', {
  state: {
    isActive: false,
    color: 'blue',
    size: 16,
  },

  template: (el) => html`
    <div
      class="${classMap({
        active: el.state.isActive,
        inactive: !el.state.isActive,
      })}"
      style="${styleMap({
        color: el.state.color,
        fontSize: `${el.state.size}px`,
      })}">
      Dynamic Content
    </div>
  `,
});
```

## Event Handling

### Direct Element Binding

```ts
defineElement('simple-button', {
  template: html`<button id="submit">Submit</button>`,

  onConnected(el) {
    const button = el.find('#submit');
    if (button) {
      el.on(button, 'click', () => {
        console.log('Button clicked!');
      });
    }
  },
});
```

### Event Delegation

Handle events on dynamic elements:

```ts
defineElement('todo-list', {
  state: {
    todos: ['Task 1', 'Task 2', 'Task 3'],
  },

  template: (el) => html`
    <ul>
      ${el.state.todos
        .map(
          (todo, i) => `
        <li>
          ${todo}
          <button class="delete" data-index="${i}">Delete</button>
        </li>
      `,
        )
        .join('')}
    </ul>
    <button class="add">Add Todo</button>
  `,

  onConnected(el) {
    // Delegation works for dynamically added elements!
    el.on('.delete', 'click', (e) => {
      const index = +(e.currentTarget as HTMLElement).dataset.index!;
      el.state.todos.splice(index, 1);
    });

    el.on('.add', 'click', () => {
      el.state.todos.push(`Task ${el.state.todos.length + 1}`);
    });
  },
});
```

### Custom Events

```ts
defineElement('custom-emitter', {
  template: html`<button>Emit Event</button>`,

  onConnected(el) {
    el.on('button', 'click', () => {
      el.emit('custom-event', {
        message: 'Hello from component!',
        timestamp: Date.now(),
      });
    });
  },
});

// Listen from outside
const component = document.querySelector('custom-emitter');
component?.addEventListener('custom-event', ((e: CustomEvent) => {
  console.log(e.detail.message);
}) as EventListener);
```

### Event Options

```ts
el.on(
  'button',
  'click',
  (e) => {
    console.log('Clicked once!');
  },
  { once: true },
); // Remove after first trigger

el.on(
  'div',
  'scroll',
  (e) => {
    console.log('Scrolling');
  },
  { passive: true },
); // Passive listener for performance
```

## DOM Queries

### Find Single Element

```ts
defineElement('query-example', {
  template: html`
    <div id="container">
      <button class="submit">Submit</button>
      <input type="text" name="username" />
    </div>
  `,

  onConnected(el) {
    // Type-safe queries
    const button = el.find<HTMLButtonElement>('.submit');
    const input = el.find<HTMLInputElement>('input[name="username"]');
    const container = el.find<HTMLDivElement>('#container');

    console.log(button?.textContent); // 'Submit'
  },
});
```

### Find Multiple Elements

```ts
defineElement('multi-query', {
  template: html`
    <div class="item">Item 1</div>
    <div class="item">Item 2</div>
    <div class="item">Item 3</div>
  `,

  onConnected(el) {
    const items = el.findAll<HTMLDivElement>('.item');
    console.log(items.length); // 3

    items.forEach((item, index) => {
      console.log(item.textContent);
    });
  },
});
```

## Lifecycle Hooks

### onConnected

Called when component is added to the DOM:

```ts
defineElement('lifecycle-demo', {
  template: html`<div>Component</div>`,

  onConnected(el) {
    console.log('Component mounted!');

    // Perfect place for:
    // – Event listeners
    // – API calls
    // – Subscriptions
    // – Third-party library initialization
  },
});
```

### onDisconnected

Called when component is removed from the DOM:

```ts
defineElement('cleanup-demo', {
  template: html`<div>Component</div>`,

  onDisconnected(el) {
    console.log('Component unmounted!');

    // Cleanup is mostly automatic, but you can:
    // – Close connections
    // – Clear external subscriptions
    // – Clean up third-party libraries
  },
});
```

### onUpdated

Called after each render:

```ts
defineElement('update-tracker', {
  state: { count: 0 },
  template: (el) => html`<div>Count: ${el.state.count}</div>`,

  onUpdated(el) {
    console.log('Rendered with count:', el.state.count);

    // Use for:
    // – DOM measurements
    // – Third-party library updates
    // – Analytics tracking
  },
});
```

### onAttributeChanged

Called when observed attributes change:

```ts
defineElement('attr-watcher', {
  template: html`<div>Component</div>`,
  observedAttributes: ['data-theme', 'data-size'] as const,

  onAttributeChanged(name, oldValue, newValue, el) {
    console.log(`Attribute "${name}" changed from "${oldValue}" to "${newValue}"`);

    if (name === 'data-theme') {
      el.state.theme = newValue;
    }
  },
});

// <attr-watcher data-theme="dark" data-size="large"></attr-watcher>
```

## Observed Attributes

Attributes automatically become properties:

```ts
defineElement('my-input', {
  template: (el) => html`<input type="text" placeholder="${el.placeholder || 'Enter text'}" />`,

  observedAttributes: ['placeholder', 'disabled'] as const,
});

// Usage in HTML
// <my-input placeholder="Username"></my-input>

// Access in TypeScript
const input = document.querySelector('my-input') as WebComponent & {
  placeholder: string;
  disabled: boolean;
};

input.placeholder = 'New placeholder'; // ✅ Updates attribute
console.log(input.disabled); // ✅ Reads attribute
```

### Boolean Attributes

```ts
defineElement('toggle-button', {
  template: (el) => html`<button>${el.active ? 'Active' : 'Inactive'}</button>`,

  observedAttributes: ['active'] as const,
});

// <toggle-button active></toggle-button>  // active = true
// <toggle-button></toggle-button>          // active = null

const button = document.querySelector('toggle-button') as WebComponent & { active: boolean };
button.active = true; // Sets attribute to empty string
button.active = false; // Removes attribute
```

## Form Associated Elements

Create custom form controls:

```ts
defineElement('custom-slider', {
  state: { value: 50 },

  template: (el) => html`
    <div class="slider">
      <input type="range" min="0" max="100" value="${el.state.value}" />
      <span>${el.state.value}</span>
    </div>
  `,

  formAssociated: true,
  observedAttributes: ['value', 'name'] as const,

  onConnected(el) {
    el.on('input', 'input', (e) => {
      const value = +(e.currentTarget as HTMLInputElement).value;
      el.state.value = value;
      el.form?.value(String(value));
    });
  },
});

// Use in forms
// <form>
//   <custom-slider name="volume" value="75"></custom-slider>
//   <button type="submit">Submit</button>
// </form>
```

### Form Validation

```ts
defineElement('validated-input', {
  state: { value: '', error: '' },

  template: (el) => html`
    <div>
      <input type="email" value="${el.state.value}" />
      ${el.state.error ? `<span class="error">${el.state.error}</span>` : ''}
    </div>
  `,

  formAssociated: true,

  onConnected(el) {
    el.on('input', 'input', (e) => {
      const value = (e.currentTarget as HTMLInputElement).value;
      el.state.value = value;

      // Validate
      if (!value) {
        el.state.error = 'Required';
        el.form?.valid({ valueMissing: true }, 'Required');
      } else if (!value.includes('@')) {
        el.state.error = 'Invalid email';
        el.form?.valid({ typeMismatch: true }, 'Invalid email');
      } else {
        el.state.error = '';
        el.form?.valid(); // Clear validation
      }

      el.form?.value(value);
    });
  },
});
```

## State Watchers

React to specific state changes:

```ts
defineElement('watcher-demo', {
  state: {
    count: 0,
    user: { name: 'Alice' },
  },

  template: (el) => html`<div>Count: ${el.state.count}</div>`,

  onConnected(el) {
    // Watch a single value
    const unwatch = el.watch(
      (state) => state.count,
      (count, prevCount) => {
        console.log(`Count changed from ${prevCount} to ${count}`);
      },
    );

    // Watch nested value
    el.watch(
      (state) => state.user.name,
      (name, prevName) => {
        console.log(`Name changed from ${prevName} to ${name}`);
      },
    );

    // Cleanup
    el.delay(() => unwatch(), 5000);
  },
});
```

## Timeouts and Cleanup

Automatic cleanup on disconnect:

```ts
defineElement('timer', {
  state: { seconds: 0 },

  template: (el) => html`<div>Elapsed: ${el.state.seconds}s</div>`,

  onConnected(el) {
    // Set timeout (auto-cleanup on disconnect)
    const id = el.delay(() => {
      console.log('Timeout fired!');
    }, 5000);

    // Clear manually if needed
    el.clear(id);

    // Recurring timer
    const intervalId = setInterval(() => {
      el.state.seconds++;
    }, 1000);

    // Manual cleanup needed for intervals
    el.delay(() => {
      clearInterval(intervalId);
    }, 10000);
  },
});
```

## Rendering

### Manual Render

```ts
el.render(); // Schedule a render
await el.flush(); // Wait for render to complete
```

### Async Operations

```ts
defineElement('async-loader', {
  state: { data: null, loading: false },

  template: (el) => html` <div>${el.state.loading ? 'Loading...' : JSON.stringify(el.state.data)}</div> `,

  async onConnected(el) {
    el.state.loading = true;

    await el.set(async (state) => {
      const data = await fetch('/api/data').then((r) => r.json());
      return { ...state, data, loading: false };
    });
  },
});
```

## Testing

### Basic Testing

```ts
import { defineElement, html, attach, destroy } from '@vielzeug/craftit';
import { expect, test } from 'vitest';

test('counter increments', async () => {
  defineElement('test-counter', {
    state: { count: 0 },
    template: (el) => html`
      <div class="count">${el.state.count}</div>
      <button>+</button>
    `,
    onConnected(el) {
      el.on('button', 'click', () => el.state.count++);
    },
  });

  const el = document.createElement('test-counter');
  await attach(el); // Mounts and waits for render

  expect(el.find('.count')?.textContent).toBe('0');

  el.find<HTMLButtonElement>('button')?.click();
  await el.flush(); // Wait for re-render

  expect(el.find('.count')?.textContent).toBe('1');

  destroy(el); // Clean removal
});
```

### Testing State Updates

```ts
test('state updates', async () => {
  const el = document.createElement('test-counter');
  await attach(el);

  // Direct state mutation
  el.state.count = 10;
  await el.flush();
  expect(el.find('.count')?.textContent).toBe('10');

  // Batch update
  await el.set({ count: 20 });
  expect(el.find('.count')?.textContent).toBe('20');
});
```

## Type Safety

### Typed Component

```ts
type UserProfileState = {
  name: string;
  email: string;
  age: number;
  isActive: boolean;
};

defineElement('user-profile', {
  state: {
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
    isActive: true,
  } as UserProfileState,

  template: (el) => html`
    <div>
      <h2>${el.state.name}</h2>
      <p>${el.state.email}</p>
    </div>
  `,
});

// Type-safe access
const profile = document.createElement('user-profile') as WebComponent<HTMLElement, UserProfileState>;
profile.state.name = 'Bob'; // ✅ Type-safe
profile.state.unknown = 'value'; // ❌ TypeScript error
```

## Best Practices

### 1. Use Event Delegation

```ts
// ✅ Good – works for dynamic elements
el.on('.item', 'click', handler);

// ❌ Bad – must re-bind after state changes
el.findAll('.item').forEach((item) => {
  item.addEventListener('click', handler);
});
```

### 2. Batch State Updates

```ts
// ✅ Good – single re-render
await el.set({ name: 'Alice', age: 30, email: 'alice@example.com' });

// ❌ Bad – three re-renders
el.state.name = 'Alice';
el.state.age = 30;
el.state.email = 'alice@example.com';
```

### 3. Use Watchers for Side Effects

```ts
// ✅ Good – declarative
el.watch(
  (state) => state.userId,
  async (userId) => {
    const user = await fetchUser(userId);
    el.state.user = user;
  },
);

// ❌ Bad – imperative
el.state.userId = 123;
const user = await fetchUser(el.state.userId);
el.state.user = user;
```

### 4. Keep Templates Pure

```ts
// ✅ Good – pure template
template: (el) => html`<div>Count: ${el.state.count}</div>`;

// ❌ Bad – side effects in template
template: (el) => {
  console.log('Rendering...'); // Side effect!
  return html`<div>Count: ${el.state.count}</div>`;
};
```
