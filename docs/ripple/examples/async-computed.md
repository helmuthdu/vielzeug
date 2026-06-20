---
title: 'Ripple Examples — Async Computed'
description: 'Async Computed example for @vielzeug/ripple.'
---

## Async Computed

### Problem

You need to fetch data reactively — re-running the fetch whenever a reactive dependency changes, automatically cancelling the in-flight request, and tracking loading/error/fulfilled state.

### Solution

Use `resource()` to wrap an async factory. Dependencies read synchronously before the first `await` are tracked. The factory receives an `AbortSignal` that fires when it is superseded or disposed.

The returned `Computed<ResourceState<T>>` emits a single discriminated union:

| `status`    | Fields present                          |
| ----------- | --------------------------------------- |
| `'loading'` | `data: T \| undefined`                  |
| `'ready'`   | `data: T`                               |
| `'error'`   | `data: T \| undefined`, `error: unknown` |

```ts
import { signal, effect, resource } from '@vielzeug/ripple';

const userId = signal('u1');

const user = resource(async (abortSignal) => {
  const id = userId.value; // tracked dep — must be read synchronously
  const res = await fetch(`/api/users/${id}`, { signal: abortSignal });
  if (!res.ok) throw new Error(`User ${id} not found`);
  return res.json() as Promise<{ id: string; name: string }>;
});

effect(() => {
  const s = user.value; // ResourceState<{ id: string; name: string }>
  if (s.status === 'loading') {
    document.body.innerHTML = '<p>Loading…</p>';
    return;
  }
  if (s.status === 'error') {
    document.body.innerHTML = `<p>Error: ${String(s.error)}</p>`;
    return;
  }
  // s.status === 'ready' — s.data is narrowed to { id: string; name: string }
  document.body.innerHTML = `<p>Hello, ${s.data.name}!</p>`;
});

userId.value = 'u2'; // aborts the in-flight fetch and re-runs
user.dispose(); // cancel and detach
```

#### With an Initial Value

Provide `initialValue` to populate `data` in the initial `loading` state before the first factory run resolves:

```ts
import { signal, resource } from '@vielzeug/ripple';

const q = signal('ripple');

const results = resource(
  async (abortSignal) => {
    const query = q.value; // tracked
    return fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: abortSignal }).then(
      (r) => r.json() as Promise<string[]>,
    );
  },
  { initialValue: [] }, // results.value.data is [] while status is 'loading'
);
```

### Pitfalls

- Dependencies must be read **synchronously** before the first `await`. Reads inside `await` expressions are not tracked.
- When a dep changes while a fetch is in-flight, the old `AbortSignal` fires. Always pass it to `fetch()` to respect cancellation. `status` immediately becomes `'loading'` again.
- `resource()` does not retry on error. Handle retries inside the factory by catching and re-throwing after a delay.

### Related

- [Usage Guide — Async Computed](../usage.md#async-computed)
- [Pattern: Async Workflows with watch](./pattern-nextvalue-in-async-workflows.md)
- [Signals](./signals.md)
