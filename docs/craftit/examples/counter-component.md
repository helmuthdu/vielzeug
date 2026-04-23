---
title: 'Craftit Examples — Counter Component'
description: 'Counter Component example for craftit.'
---

## Counter Component

## Problem

Implement a counter component in a production-friendly way with `@vielzeug/craftit`.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { define, html, signal } from '@vielzeug/craftit';

define('simple-counter', {
  setup() {
    const count = signal(0);

    return {
      render: () => html`
        <div>
          <button @click=${() => count.value--}>-</button>
          <strong>${count}</strong>
          <button @click=${() => count.value++}>+</button>
        </div>
      `,
    };
  },
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- Clicking `-` and `+` updates the displayed count reactively.

## Common Pitfalls

- Storing transient UI state in props is unnecessary; use `signal()` inside `setup()` for local state.
- Forgetting cleanup/dispose calls can leak listeners or stale state; use `onCleanup()` or `handle()`.

## Related Recipes

- [Props DSL](./propsof-builder-api.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
- [Context Provider and Consumer](./context-provider-and-consumer.md)
