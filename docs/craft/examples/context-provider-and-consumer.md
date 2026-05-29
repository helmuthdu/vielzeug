---
title: 'Craft Examples — Context Provider and Consumer'
description: 'Context Provider and Consumer examples for craft.'
---

## Context Provider and Consumer

### Problem

You have parent and child custom elements that need to share data without threading it through attributes on every intermediate element. Prop-drilling through N layers of markup becomes fragile as the tree grows.

### Solution

```ts
import { createContext, define, html, inject, provide, signal } from '@vielzeug/craft';

const THEME_CTX = createContext<ReturnType<typeof signal<'light' | 'dark'>>>('theme');

define('theme-provider', {
  setup() {
    const theme = signal<'light' | 'dark'>('light');

    provide(THEME_CTX, theme);

    return () => html`
      <button @click=${() => (theme.value = theme.value === 'light' ? 'dark' : 'light')}>Toggle theme</button>
      <slot></slot>
    `;
  },
});

define('theme-label', {
  setup() {
    const theme = inject(THEME_CTX, signal<'light' | 'dark'>('light'));

    return () => html`<p>Theme: ${theme}</p>`;
  },
});
```


### Pitfalls

- The provider must be an ancestor in the custom element tree, not just the DOM tree. A child appended outside the provider's shadow root cannot find the context.
- Context is resolved when the child connects. Setting context values after a child is already connected has no effect unless the child explicitly re-reads it.
- Multiple providers with the same key cause the nearest ancestor to win. Use distinct, namespaced key strings to avoid accidental shadowing.

### Related
- [DI Container (Wired)](/wired/)

- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
- [Observers in mount()](./observers-in-onmount.md)
