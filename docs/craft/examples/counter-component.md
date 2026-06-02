---
title: 'Craft Examples — Counter Component'
description: 'Counter Component example for @vielzeug/craft.'
---

## Counter Component

### Problem

You want to understand the minimal Craft component before adding routing, directives, or shared state. A self-contained counter covers the full cycle: reactive signal, DOM binding, and event handling.

### Solution

Use `define()` with a `setup()` that returns `html` directly.

```ts
import { define, html, signal } from '@vielzeug/craft';

define('simple-counter', {
  setup() {
    const count = signal(0);

    return html`
      <div>
        <button @click=${() => count.value--}>-</button>
        <strong>${count}</strong>
        <button @click=${() => count.value++}>+</button>
      </div>
    `;
  },
});
```

### Pitfalls

- Returning a wrapper function `() => html\`...\`` instead of `html\`...\`` directly will silently render nothing. The setup function must return an `HTMLResult`.
- Signals used in template interpolation auto-track reactivity. Wrapping them in an unnecessary `computed()` adds overhead without benefit.

### Related

- [Ripple — Signals](/ripple/) for the reactive primitives powering Craft components
- [Typed props and emits](./typed-props-and-emits.md)
- [Search list with directives](./search-list-with-directives.md)
