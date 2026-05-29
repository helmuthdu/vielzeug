---
title: 'Machine Examples — Data Fetching with Error Recovery'
description: Data fetching with error recovery example for @vielzeug/machine.
---

## Data Fetching with Error Recovery

### Problem

You need to fetch remote data, show loading state while the request is in flight, handle failures with a retry path, and automatically cancel in-flight requests when the state changes.

### Solution

Use an `invoke` array in the `loading` state. The runtime passes an `AbortSignal` to `src` and cancels it when the state is exited, preventing stale responses from updating context.

```ts
import { assign, defineMachine, interpret } from '@vielzeug/machine';

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
        FAILURE: { actions: [assign(({ event }) => ({ error: event.message }))], target: 'error' },
        SUCCESS: { actions: [assign(({ event }) => ({ data: event.items, error: '' }))], target: 'idle' },
      },
    },
  },
});

const m = interpret(fetcher);
m.send({ type: 'FETCH' }); // enters loading, invoke starts
// The AbortSignal is cancelled automatically if the state exits before the response arrives
```

### Pitfalls

- **`onDone` receives the raw resolved value.** The return type of `src` is `Promise<unknown>`, so cast the result inside `onDone` before building the event object (`(result as MyType).data`).
- **`FAILURE` and `SUCCESS` events must be defined in `on`.** If they are missing, the dispatched event is silently ignored, leaving the machine stuck in `loading`.
- **Multiple invokes race.** If you add more than one entry to the `invoke` array, all start concurrently and whichever resolves first dispatches. Use a single invoke unless you intentionally want a race.
- **`signal` is only valid inside `src`.** Do not pass it to `onDone` or `onError` — those only receive the result/error.

### Related

- [Auth Flow with Guards](./auth-flow.md) — Async invoke with guard-controlled retry
- [Persisted Wizard](./persisted-wizard.md) — Persisting context across sessions
- [API Reference — `InvokeDef`](/machine/api#invokedefctx-ev)
