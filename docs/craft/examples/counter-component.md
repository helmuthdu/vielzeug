---
title: 'Craft Examples — Counter Component'
description: 'Counter Component example for craft.'
---

## Counter Component

### Problem

You want to understand the minimal Craft component before adding routing, directives, or shared state. A self-contained counter covers the full cycle: reactive signal, DOM binding, and event handling.

### Solution

```ts
import { define, html, signal } from '@vielzeug/craft';

define('simple-counter', {
  setup() {
    const count = signal(0);

    return () => html`
      <div>
        <button @click=${() => count.value--}>-</button>
        <strong>${count}</strong>
        <button @click=${() => count.value++}>+</button>
      </div>
    `;
  },
});
```
