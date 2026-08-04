---
title: 'Clockwork Examples — Auth Flow with Guards'
description: 'Combine guarded admission with an abortable authentication invoke.'
---

## Auth Flow with Guards

### Problem

A login attempt must stop after a limit and then process an asynchronous result.

### Solution

Guard `LOGIN`, store the attempt immutably, and map invoke settlement to ordinary events.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event =
  | { email: string; type: 'LOGIN' }
  | { token: string; type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_FAILED' }
  | { type: 'LOGOUT' };

const auth = defineMachine<{ attempts: number; token: string }, Event>()({
  context: { attempts: 0, token: '' },
  initial: 'signedOut',
  states: {
    signedOut: {
      on: {
        LOGIN: {
          guard: ({ context }) => context.attempts < 3,
          reduce: ({ context }) => ({ ...context, attempts: context.attempts + 1 }),
          target: 'loading',
        },
      },
    },
    loading: {
      invoke: [{
        src: async () => ({ token: 'session-token' }),
        onDone: ({ result }) => ({ token: (result as { token: string }).token, type: 'AUTH_SUCCESS' }),
        onError: () => ({ type: 'AUTH_FAILED' }),
      }],
      on: {
        AUTH_FAILED: { target: 'signedOut' },
        AUTH_SUCCESS: { reduce: ({ event }) => ({ attempts: 0, token: event.token }), target: 'signedIn' },
      },
    },
    signedIn: { on: { LOGOUT: { reduce: () => ({ attempts: 0, token: '' }), target: 'signedOut' } } },
  },
});

const actor = auth.createActor();
actor.send({ email: 'ada@example.com', type: 'LOGIN' });
actor.subscribe((snapshot) => console.log(snapshot.state));
setTimeout(() => actor.dispose(), 0);
```

### Pitfalls

- Invokes start on state entry and their `signal` aborts when that state exits or actor disposes.
- A guard does not report a rejection reason; the result is `ignored`.

### Related

- [Data Fetching with Error Recovery](./data-fetching.md)
- [Pure Transition Testing](./unit-testing.md)
- [API Reference](../api.md)
