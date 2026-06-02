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
import { defineMachine, interpret, resolveTransition } from '@vielzeug/clockwork';

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
        LOGOUT: { actions: [({ context }) => { context.token = ''; }], target: 'unauthenticated' },
      },
    },
    error: {
      on: {
        LOGIN: {
          actions: [({ context }) => { context.attempts += 1; }],
          guard: ({ context }) => context.attempts < 3,
          target: 'loading',
        },
      },
    },
    loading: {
      invoke: [
        {
          onDone: (res) => ({ token: (res as { token: string }).token, type: 'AUTH_SUCCESS' }),
          onError: () => ({ type: 'AUTH_FAILED' }),
          src: async ({ entryEvent, signal }) => {
            if (entryEvent.type !== 'LOGIN') throw new Error('unexpected');
            return fetch('/auth/login', {
              body: JSON.stringify({ email: entryEvent.email, password: entryEvent.password }),
              headers: { 'Content-Type': 'application/json' },
              method: 'POST',
              signal,
            }).then(r => r.json());
          },
        },
      ],
      on: {
        AUTH_FAILED: { actions: [({ context }) => { context.attempts += 1; }], target: 'error' },
        AUTH_SUCCESS: { actions: [({ context, event }) => { context.attempts = 0; context.token = event.token; }], target: 'authenticated' },
      },
    },
    unauthenticated: {
      on: {
        LOGIN: {
          actions: [({ context }) => { context.attempts += 1; }],
          guard: ({ context }) => context.attempts < 3,
          target: 'loading',
        },
      },
    },
  },
});
```

### Testing guards with `resolveTransition`

```ts
import { expect, test } from 'vitest';

test('allows login with fewer than 3 attempts', () => {
  const result = resolveTransition(auth, {
    context: { attempts: 2, token: '' },
    event: { email: 'a@b.com', password: 'x', type: 'LOGIN' },
    state: 'unauthenticated',
  });
  expect(result?.target).toBe('loading');
});

test('blocks login after 3 attempts', () => {
  const result = resolveTransition(auth, {
    context: { attempts: 3, token: '' },
    event: { email: 'a@b.com', password: 'x', type: 'LOGIN' },
    state: 'unauthenticated',
  });
  expect(result).toBeUndefined();
});
```

### Pitfalls

- **Guard runs before actions.** The guard sees the context *before* actions mutate it — `attempts` is checked pre-increment.
- **`entryEvent` in invoke `src`** gives access to the event that triggered entry. Cast or check its type since it may also be a lifecycle event.
- **Always handle both `onDone` and `onError`.** If `onError` is omitted and the invoke rejects, the machine remains in the current state silently.

### Related

- [Data Fetching with Error Recovery](./data-fetching.md) — Simpler invoke pattern
- [Unit Testing with `resolveTransition()`](./unit-testing.md) — Pure guard testing
- [API Reference — `GuardFn`](/clockwork/api#guardfnctx-ev)
