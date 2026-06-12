---
title: 'Ripple Examples — Async Computed'
description: 'Async Computed example for @vielzeug/ripple.'
---

## Async Computed

### Problem

You need to fetch data reactively — re-running the fetch whenever a reactive dependency changes, automatically cancelling the in-flight request, and tracking loading/error/fulfilled state.

### Solution

Use `asyncComputed()` to wrap an async factory. Dependencies read synchronously before the first `await` are tracked. The factory receives an `AbortSignal` that fires when it is superseded or disposed.

```ts
import { signal, effect, asyncComputed } from '@vielzeug/ripple';

const userId = signal('u1');

const user = asyncComputed(async (signal) => {
  const id = userId.value; // tracked dep — must be read synchronously
  const res = await fetch(`/api/users/${id}`, { signal });
  if (!res.ok) throw new Error(`User ${id} not found`);
  return res.json() as Promise<{ id: string; name: string }>;
});

effect(() => {
  const state = user.value;
  switch (state.status) {
    case 'idle':
    case 'pending':
      document.body.innerHTML = '<p>Loading…</p>';
      break;
    case 'fulfilled':
      document.body.innerHTML = `<p>Hello, ${state.value.name}!</p>`;
      break;
    case 'error':
      document.body.innerHTML = `<p>Error: ${String(state.error)}</p>`;
      break;
  }
});

userId.value = 'u2'; // aborts the in-flight fetch and re-runs
user.dispose(); // cancel and detach
```

#### With an Initial Loading Value

Provide `initialValue` to show a placeholder while the factory runs for the first time:

```ts
import { signal, asyncComputed } from '@vielzeug/ripple';

const q = signal('ripple');

const results = asyncComputed(
  async (signal) => {
    const query = q.value; // tracked
    return fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal }).then((r) => r.json()) as Promise<string[]>;
  },
  { initialValue: [] }, // shown as `value` while status === 'pending'
);
```

### Pitfalls

- Dependencies must be read **synchronously** before the first `await`. Reads inside `await` expressions are not tracked.
- When a dep changes while a fetch is in flight, the old `AbortSignal` fires and status immediately returns to `'pending'`. Always pass the `signal` argument to `fetch()` to respect cancellation.
- `asyncComputed` does not retry on error. Handle retries inside the factory by catching and re-throwing after a delay.

### Related

- [Usage Guide — Async Computed](../usage.md#async-computed)
- [Pattern: Async Workflows with watch](./pattern-nextvalue-in-async-workflows.md)
- [Signals](./signals.md)
