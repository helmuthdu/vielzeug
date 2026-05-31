---
title: Ripple — Async Computed Example
description: Reactive async data fetching with asyncComputed.
---

# Async Computed

`asyncComputed` tracks reactive dependencies and re-runs an async factory whenever they change. The in-flight request is automatically aborted when the factory supersedes itself or is disposed.

## Basic User Fetching

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

// Change the dep — aborts the in-flight fetch and re-runs
userId.value = 'u2';

// Dispose when done
user.dispose();
```

## With an Initial Loading Value

```ts
import { asyncComputed } from '@vielzeug/ripple';

const q = signal('ripple');

const results = asyncComputed(
  async (signal) => {
    const query = q.value; // tracked
    return fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal })
      .then((r) => r.json()) as Promise<string[]>;
  },
  { initialValue: [] }, // shown as `value` while status === 'pending'
);
```

## Status Lifecycle

```
'idle'       → first read before any run starts
'pending'    → factory running (value is initialValue or last resolved value)
'fulfilled'  → factory resolved; value is the result
'error'      → factory threw or fetch was not ok; error is the caught exception
```

When a dep changes while a fetch is in flight, the old request is aborted via `AbortSignal` and the status returns to `'pending'` immediately.
