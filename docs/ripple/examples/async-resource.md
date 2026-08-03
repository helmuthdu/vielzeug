---
title: 'Ripple Examples — Async Resource'
description: 'Load cancellation-aware async data from reactive input.'
---

## Async Resource

### Problem

Data loading must follow selected input and ignore stale responses.

### Solution

Keep source capture and loader work separate on same graph.

```ts
import { createRipple } from '@vielzeug/ripple';

type User = { id: string; name: string };

const ripple = createRipple();
const userId = ripple.signal('42');
const user = ripple.resource(
  () => userId.value,
  async (id, { signal }) => {
    const response = await fetch(`/users/${id}`, { signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return (await response.json()) as User;
  },
);

if (user.value.status === 'success') console.log(user.value.value.name);
user.dispose();
ripple.dispose();
```

### Pitfalls

- Read dependencies in source, never after loader starts.
- Pass loader signal to abortable APIs.
- Handle `pending` and `error` states before success.

### Related

- [Usage Guide](../usage#async-data)
- [API Reference](../api#ripple-resource)
