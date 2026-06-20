---
title: 'Craft Examples — Context Provider and Consumer'
description: 'Context Provider and Consumer example for @vielzeug/craft.'
---

## Context Provider and Consumer

### Problem

You have parent and child custom elements that need to share data without threading it through attributes on every intermediate element. Prop-drilling through N layers of markup becomes fragile as the tree grows.

### Solution

Use `createContext()`, `ctx.provide()`, and `inject()` to share reactive state through the component tree.

```ts
import { signal } from '@vielzeug/ripple';
import { createContext, define, html, inject } from '@vielzeug/craft';

const THEME_CTX = createContext<ReturnType<typeof signal<'light' | 'dark'>>>('theme');

define('theme-provider', {
  setup(_props, { provide }) {
    const theme = signal<'light' | 'dark'>('light');

    provide(THEME_CTX, theme);

    return html`
      <button @click=${() => (theme.value = theme.value === 'light' ? 'dark' : 'light')}>Toggle theme</button>
      <slot></slot>
    `;
  },
});

define('theme-label', {
  setup() {
    const theme = inject(THEME_CTX, signal<'light' | 'dark'>('light'));

    return html`<p>Theme: ${theme}</p>`;
  },
});
```

### Pitfalls

- The provider must be an ancestor in the custom element tree, not just the DOM tree. A child appended outside the provider's shadow root cannot find the context.
- Providing a plain value (not a signal) means consumers get a snapshot, not live updates. Wrap mutable state in a `signal()` before providing.
- Multiple providers with the same key cause the nearest ancestor to win. Use distinct key strings to avoid accidental shadowing.

### Related

- [Conduit — DI Container](/conduit/) for application-level dependency injection beyond component trees
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
