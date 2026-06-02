---
title: 'Clockwork Examples — Data Fetching with Error Recovery'
description: Data fetching with error recovery example for @vielzeug/clockwork.
---

## Data Fetching with Error Recovery

### Problem

You need to fetch remote data, show loading state while the request is in flight, handle failures with a retry path, and automatically cancel in-flight requests when the state changes.

### Solution

Use an `invoke` array in the `loading` state. The runtime passes an `AbortSignal` to `src` and cancels it when the state is exited, preventing stale responses from updating context.

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';

type State = 'error' | 'idle' | 'loading';
type Context = { data: string[]; error: string };
type Event =
  | { type: 'FETCH' }
  | { type: 'RETRY' }
  | { items: string[]; type: 'SUCCESS' }
  | { message: string; type: 'FAILURE' };

const fetcher = defineMachine<State, Context, Event>({
  context: { data: [], error: '' },
  initial: 'idle',
  states: {
    error: {
      on: { RETRY: { target: 'loading' } },
    },
    idle: {
      on: { FETCH: { target: 'loading' } },
    },
    loading: {
      invoke: [
        {
          onDone:  (items) => ({ items: items as string[], type: 'SUCCESS' }),
          onError: (err)   => ({ message: String(err), type: 'FAILURE' }),
          src: async ({ signal }) => {
            const res = await fetch('/api/items', { signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          },
        },
      ],
      on: {
        FAILURE: { actions: [({ context, event }) => { context.error = event.message; }], target: 'error' },
        SUCCESS: { actions: [({ context, event }) => { context.data = event.items; context.error = ''; }], target: 'idle' },
      },
    },
  },
});

const m = interpret(fetcher);
m.send({ type: 'FETCH' }); // enters loading, invoke starts
// The AbortSignal is cancelled automatically if the state exits before the response arrives
```

### Pitfalls

- **`onDone` receives the raw resolved value.** The return type of `src` is `Promise<unknown>`, so cast the result inside `onDone` before building the event object.
- **`FAILURE` and `SUCCESS` events must be defined in `on`.** If they are missing, the dispatched event is silently ignored, leaving the machine stuck in `loading`.
- **Multiple invokes race.** If you add more than one entry to the `invoke` array, all start concurrently and whichever resolves first dispatches. Use a single invoke unless you intentionally want a race.
- **`signal` is only valid inside `src`.** Do not pass it to `onDone` or `onError` — those only receive the result/error.
- **Context in `onDone`/`onError` args is captured at invoke start.** This prevents stale-context bugs when the machine transitions between invoke creation and resolution.

### Related

- [Auth Flow with Guards](./auth-flow.md) — Async invoke with guard-controlled retry
- [Persisted Wizard](./persisted-wizard.md) — Persisting context across sessions
- [API Reference — `InvokeDef`](/clockwork/api#invokedefctx-ev)
