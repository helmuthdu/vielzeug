---
title: 'Clockwork Examples — Unit Testing with resolveTransition'
description: Unit testing with resolveTransition example for @vielzeug/clockwork.
---

## Unit Testing with `resolveTransition()`

### Problem

You want to test guard conditions and transition targets in isolation, without spinning up a live machine instance, running invokes, or triggering entry/exit side effects.

### Solution

Use `resolveTransition()` directly in unit tests. It returns the matching `TransitionDef` when a transition would be taken, or `undefined` when no transition matches (guard blocked or event not defined in the current state).

```ts
import { defineMachine, resolveTransition } from '@vielzeug/clockwork';
import { expect, test } from 'vitest';

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
    authenticated: { on: { LOGOUT: { target: 'unauthenticated' } } },
    error: {
      on: {
        LOGIN: { guard: ({ context }) => context.attempts < 3, target: 'loading' },
      },
    },
    loading: {
      on: {
        AUTH_FAILED: { target: 'error' },
        AUTH_SUCCESS: { target: 'authenticated' },
      },
    },
    unauthenticated: {
      on: {
        LOGIN: { guard: ({ context }) => context.attempts < 3, target: 'loading' },
      },
    },
  },
});

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

test('returns undefined for undefined event in state', () => {
  const result = resolveTransition(auth, {
    context: { attempts: 0, token: '' },
    event: { email: 'a@b.com', password: 'x', type: 'LOGIN' },
    state: 'loading', // LOGIN is not defined in loading
  });
  expect(result).toBeUndefined();
});
```

### Using the `onGuard` callback

`resolveTransition` accepts an optional third argument to observe each guard evaluation:

```ts
test('reports guard evaluation', () => {
  const evaluations: Array<{ passed: boolean; target: string }> = [];

  resolveTransition(
    auth,
    {
      context: { attempts: 5, token: '' },
      event: { email: 'a@b.com', password: 'x', type: 'LOGIN' },
      state: 'unauthenticated',
    },
    (info) => {
      evaluations.push({ passed: info.passed, target: info.target });
    },
  );

  expect(evaluations[0]).toEqual({ passed: false, target: 'loading' });
});
```

### Pitfalls

- **`resolveTransition()` does not fire `onDebug` events.** Debug events only fire during `send()`. Guards are still evaluated, but silently.
- **Guards must be pure.** `resolveTransition()` evaluates the guard synchronously. Guards that read from signals or perform async work will not behave correctly.
- **Test the definition, not the instance.** Pass the definition returned by `defineMachine()`, not a live `MachineInstance`.

### Related

- [Auth Flow with Guards](./auth-flow.md) — The full machine this example tests
- [Debugging Transitions](./debugging-transitions.md) — Runtime observability with debug events
- [API Reference — `resolveTransition()`](/clockwork/api#resolvetransition)
