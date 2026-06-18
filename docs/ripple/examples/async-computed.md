---
title: 'Ripple Examples — Async Computed'
description: 'Async Computed example for @vielzeug/ripple.'
---

## Async Computed

### Problem

You need to fetch data reactively — re-running the fetch whenever a reactive dependency changes, automatically cancelling the in-flight request, and tracking loading/error/fulfilled state.

### Solution

Use `resource()` to wrap an async factory. Dependencies read synchronously before the first `await` are tracked. The factory receives an `AbortSignal` that fires when it is superseded or disposed. The returned handle exposes `.data`, `.error`, and `.isLoading` as individual reactive signals.

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
  if (user.isLoading.value) {
    document.body.innerHTML = '<p>Loading…</p>';
    return;
  }
  if (user.error.value) {
    document.body.innerHTML = `<p>Error: ${String(user.error.value)}</p>`;
    return;
  }
  const u = user.data.value;
  document.body.innerHTML = u ? `<p>Hello, ${u.name}!</p>` : '';
});

userId.value = 'u2'; // aborts the in-flight fetch and re-runs
user.dispose(); // cancel and detach
```

#### With an Initial Value

Provide `initialValue` to expose a placeholder in `.data` before the first factory run resolves:

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
  { initialValue: [] }, // results.data.value is [] while isLoading is true
);
```

### Pitfalls

- Dependencies must be read **synchronously** before the first `await`. Reads inside `await` expressions are not tracked.
- When a dep changes while a fetch is in-flight, the old `AbortSignal` fires. Always pass it to `fetch()` to respect cancellation. `.isLoading.value` immediately becomes `true` again.
- `resource()` does not retry on error. Handle retries inside the factory by catching and re-throwing after a delay.

### Related

- [Usage Guide — Async Computed](../usage.md#async-computed)
- [Pattern: Async Workflows with watch](./pattern-nextvalue-in-async-workflows.md)
- [Signals](./signals.md)
