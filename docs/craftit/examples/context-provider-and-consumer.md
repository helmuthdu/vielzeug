---
title: 'Craftit Examples — Context Provider and Consumer'
description: 'Context Provider and Consumer examples for craftit.'
---

## Context Provider and Consumer

## Problem

Implement context provider and consumer in a production-friendly way with `@vielzeug/craftit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { createContext, defineComponent, html, inject, provide, signal } from '@vielzeug/craftit';

const THEME_CTX = createContext<ReturnType<typeof signal<'light' | 'dark'>>>('theme');

defineComponent({
  setup() {
    const theme = signal<'light' | 'dark'>('light');

    provide(THEME_CTX, theme);

    return html`
      <button @click=${() => (theme.value = theme.value === 'light' ? 'dark' : 'light')}>Toggle theme</button>
      <slot></slot>
    `;
  },
  tag: 'theme-provider',
});

defineComponent({
  setup() {
    const theme = inject(THEME_CTX);

    return html`<p>Theme: ${() => theme?.value ?? 'light'}</p>`;
  },
  tag: 'theme-label',
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
- [Observers in `onMount`](./observers-in-onmount.md)
