---
title: 'Clockwork Examples — Fetch with Retry'
description: 'Limit retries with context, guards, an invoke, and delayed transitions.'
---

## Fetch with Retry

### Problem

A failed request should retry after a delay but stop after a fixed number of attempts.

### Solution

Keep the counter in context and guard both the delayed and manual retry transitions.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'FETCH' } | { type: 'RETRY' } | { message: string; type: 'FAILED' } | { data: string; type: 'DONE' };

const request = defineMachine<{ attempts: number; data: string; error: string }, Event>()({
  context: { attempts: 0, data: '', error: '' },
  initial: 'idle',
  states: {
    idle: { on: { FETCH: { reduce: () => ({ attempts: 1, data: '', error: '' }), target: 'loading' } } },
    loading: {
      invoke: [{
        src: async ({ signal }) => fetch('/api/data', { signal }).then((response) => response.text()),
        onDone: ({ result }) => ({ data: result as string, type: 'DONE' }),
        onError: ({ error }) => ({ message: String(error), type: 'FAILED' }),
      }],
      on: {
        DONE: { reduce: ({ context, event }) => ({ ...context, data: event.data }), target: 'success' },
        FAILED: { reduce: ({ context, event }) => ({ ...context, error: event.message }), target: 'failed' },
      },
    },
    failed: {
      after: [{ delay: 1_000, guard: ({ context }) => context.attempts < 3, reduce: ({ context }) => ({ ...context, attempts: context.attempts + 1 }), target: 'loading' }],
      on: { RETRY: { guard: ({ context }) => context.attempts < 3, reduce: ({ context }) => ({ ...context, attempts: context.attempts + 1 }), target: 'loading' } },
    },
    success: { on: { FETCH: { reduce: () => ({ attempts: 1, data: '', error: '' }), target: 'loading' } } },
  },
});

const actor = request.createActor();
actor.subscribe((snapshot) => console.log(snapshot.state, snapshot.context.attempts));
actor.send({ type: 'FETCH' });
```

### Pitfalls

- An `after` guard that fails leaves the actor in the current state.
- Count attempts at retry entry, not only when a request fails.

### Related

- [Data Fetching with Error Recovery](./data-fetching.md)
- [Auto-Dismiss Notification](./auto-dismiss-notification.md)
- [API Reference](../api.md)
