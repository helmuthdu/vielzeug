---
title: 'Clockwork Examples — Data Fetching with Error Recovery'
description: 'Map an abortable invoke into success and failure transitions.'
---

## Data Fetching with Error Recovery

### Problem

A request must show loading state, commit data on success, and offer a retry after failure.

### Solution

Invoke the request in `loading`, then convert its settlement into events handled by the state map.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event =
  | { type: 'FETCH' }
  | { items: string[]; type: 'SUCCESS' }
  | { message: string; type: 'FAILURE' }
  | { type: 'RETRY' };

const fetcher = defineMachine<{ error: string; items: string[] }, Event>()({
  context: { error: '', items: [] },
  initial: 'idle',
  states: {
    idle: { on: { FETCH: { target: 'loading' } } },
    loading: {
      invoke: [{
        src: async ({ signal }) => {
          const response = await fetch('/api/items', { signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json() as Promise<string[]>;
        },
        onDone: ({ result }) => ({ items: result as string[], type: 'SUCCESS' }),
        onError: ({ error }) => ({ message: String(error), type: 'FAILURE' }),
      }],
      on: {
        FAILURE: { reduce: ({ event }) => ({ error: event.message, items: [] }), target: 'error' },
        SUCCESS: { reduce: ({ event }) => ({ error: '', items: event.items }), target: 'ready' },
      },
    },
    ready: { on: { FETCH: { target: 'loading' } } },
    error: { on: { RETRY: { target: 'loading' } } },
  },
});

const actor = fetcher.createActor();
actor.subscribe((snapshot) => console.log(snapshot.state, snapshot.context));
actor.send({ type: 'FETCH' });
```

### Pitfalls

- Check `response.ok`; `fetch()` resolves for HTTP error responses.
- Dispose the actor when the request owner unmounts to abort active work.

### Related

- [Fetch with Retry](./fetch-retry.md)
- [Auto-Dismiss Notification](./auto-dismiss-notification.md)
- [API Reference](../api.md)
