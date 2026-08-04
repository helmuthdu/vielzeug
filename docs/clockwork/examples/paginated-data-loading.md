---
title: 'Clockwork Examples — Paginated Data Loading'
description: 'Represent query workflow state while an invoke loads each page.'
---

## Paginated Data Loading

### Problem

Search and page events must replace query parameters and load a corresponding result page.

### Solution

Reduce parameters before entering `loading`, then invoke the query from that state.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event =
  | { query: string; type: 'SEARCH' }
  | { page: number; type: 'PAGE' }
  | { type: 'DONE' }
  | { type: 'FAILED' }
  | { type: 'RETRY' };

const results = defineMachine<{ page: number; query: string }, Event>()({
  context: { page: 1, query: '' },
  initial: 'idle',
  states: {
    idle: {
      on: {
        SEARCH: { reduce: ({ event }) => ({ page: 1, query: event.query }), target: 'loading' },
        PAGE: { reduce: ({ context, event }) => ({ ...context, page: event.page }), target: 'loading' },
      },
    },
    loading: {
      invoke: [{
        src: async ({ context, signal }) => fetch(`/api/search?q=${context.query}&page=${context.page}`, { signal }),
        onDone: () => ({ type: 'DONE' }),
        onError: () => ({ type: 'FAILED' }),
      }],
      on: { DONE: { target: 'ready' }, FAILED: { target: 'error' } },
    },
    ready: { on: { SEARCH: { reduce: ({ event }) => ({ page: 1, query: event.query }), target: 'loading' } } },
    error: { on: { RETRY: { target: 'loading' } } },
  },
});

const actor = results.createActor();
actor.subscribe((snapshot) => console.log(snapshot));
actor.send({ query: 'books', type: 'SEARCH' });
```

### Pitfalls

- Keep cached pages and result data in the data layer unless they are workflow state.
- Exiting `loading` aborts its invoke; handle cancellation in the request implementation.

### Related

- [Data Fetching with Error Recovery](./data-fetching.md)
- [Fetch with Retry](./fetch-retry.md)
- [API Reference](../api.md)
