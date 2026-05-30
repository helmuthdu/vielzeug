---
title: 'Clockwork Examples — Auth Flow with Guards'
description: Auth flow with guards example for @vielzeug/clockwork.
---

## Auth Flow with Guards

### Problem

You need an authentication flow that limits brute-force attempts, performs an async login request, manages tokens, and handles logout — all as explicit, type-safe state transitions.

### Solution

Use guards to block the `LOGIN` transition after three failed attempts, and `invoke` in `loading` to perform the async login call. The attempt counter accumulates in context so the guard has access on every retry.

```ts
import { assign, defineMachine, interpret } from '@vielzeug/clockwork';

type State = 'authenticated' | 'error' | 'loading' | 'unauthenticated';
type Context = { attempts: number; token: string };
type Event =
  | { email: string; password: string; type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { token: string; type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_FAILED' };

const auth = defineMachine<State, Context, Event>({
  context: { attempts: 0, token: '' },
  initial: 'unauthenticated',
  states: {
    authenticated: {
      on: {
        LOGOUT: { actions: [assign(() => ({ token: '' }))], target: 'unauthenticated' },
      },
    },
    error: {
      on: {
        LOGIN: {
          actions: [assign(({ context }) => ({ attempts: context.attempts + 1 }))],
          guard:   ({ context }) => context.attempts < 3,
          target:  'loading',
        },
      },
    },
    loading: {
      invoke: [
        {
          onDone:  (res) => ({ token: (res as { token: string }).token, type: 'AUTH_SUCCESS' }),
          onError: ()    => ({ type: 'AUTH_FAILED' }),
          src: async ({ event, signal }) => {
            if (event.type !== 'LOGIN') throw new Error('unexpected');
            return fetch('/auth/login', {
              body: JSON.stringify({ email: event.email, password: event.password }),
              headers: { 'Content-Type': 'application/json' },
              method: 'POST',
              signal,
            }).then(r => r.json());
          },
        },
      ],
      on: {
        AUTH_FAILED:  { actions: [assign(({ context }) => ({ attempts: context.attempts + 1 }))], target: 'error' },
        AUTH_SUCCESS: { actions: [assign(({ event }) => ({ attempts: 0, token: event.token }))], target: 'authenticated' },
      },
    },
    unauthenticated: {
      on: {
        LOGIN: {
          actions: [assign(({ context }) => ({ attempts: context.attempts + 1 }))],
          guard:   ({ context }) => context.attempts < 3,
          target:  'loading',
        },
      },
    },
  },
});

// Test guard behaviour with resolveTransition
import { resolveTransition } from '@vielzeug/clockwork';
import { expect, test } from 'vitest';

test('blocks login after 3 attempts', () => {
  const result = resolveTransition(auth, {
    context: { attempts: 3, token: '' },
    event:   { email: 'a@b.com', password: 'x', type: 'LOGIN' },
    state:   'unauthenticated',
  });
  expect(result).toBeUndefined();
});
```

### Pitfalls

- **Guard runs before `actions`.** The attempt counter in this example increments inside `actions`, which run only when the guard passes. If you want to count blocked attempts too, track them separately.
- **`event.type` narrowing inside `src`.** The `event` received by `src` is the last event that triggered entry into `loading`. Narrow it explicitly (`if (event.type !== 'LOGIN') throw`) to avoid TypeScript errors and runtime surprises from synthetic `$init` events.
- **Clearing attempts on logout.** The LOGOUT transition only clears `token`. Add `attempts: 0` to the `assign()` call if you want to reset the lockout on logout.

### Related

- [Data Fetching with Error Recovery](./data-fetching.md) — Simpler async invoke pattern
- [Permission-Based Access Control](./permission-based-access.md) — Role-based transition gating
- [API Reference — `GuardFn`](/clockwork/api#guardfnctx-ev)
