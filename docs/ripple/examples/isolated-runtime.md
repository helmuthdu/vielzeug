---
title: 'Ripple Examples — Isolated Graph'
description: 'Create request-scoped reactive state without global hooks.'
---

## Isolated Graph

### Problem

Concurrent requests must not share reactive scheduling, ownership, or failures.

### Solution

Create one graph per request and dispose it after rendering.

```ts
import { createRipple } from '@vielzeug/ripple';

async function renderRequest(): Promise<string> {
  const ripple = createRipple();

  try {
    const count = ripple.signal(0);
    const label = ripple.computed(() => `Count: ${count.value}`);

    return `<p>${label.value}</p>`;
  } finally {
    ripple.dispose();
  }
}
```

### Pitfalls

- Do not mix values from different graphs.
- Dispose graphs created per request, test, or feature.

### Related

- [Usage Guide](../usage#isolated-graphs)
- [API Reference](../api)
