---
title: 'Clockwork Examples — Pure Transition Testing'
description: 'Test guards and reducers without an actor runtime.'
---

## Pure Transition Testing

### Problem

You want to test transition selection and context updates without effects, timers, or subscriptions.

### Solution

Call `machine.transition()` with a snapshot and assert its returned result.

```ts
import { expect, test } from 'vitest';
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'LOGIN' };
const auth = defineMachine<{ attempts: number }, Event>()({
  context: { attempts: 0 },
  initial: 'signedOut',
  states: {
    signedOut: {
      on: {
        LOGIN: {
          guard: ({ context }) => context.attempts < 3,
          reduce: ({ context }) => ({ attempts: context.attempts + 1 }),
          target: 'loading',
        },
      },
    },
    loading: {},
  },
});

test('allows login below the limit', () => {
  const result = auth.transition({ context: { attempts: 2 }, state: 'signedOut' }, { type: 'LOGIN' });

  expect(result).toMatchObject({
    snapshot: { context: { attempts: 3 }, state: 'loading' },
    type: 'transition',
  });
});
```

### Pitfalls

- Pure transitions return only a snapshot and result type; they never execute runtime work.
- Test timers, invokes, subscriptions, and disposal through an actor.

### Related

- [Auth Flow with Guards](./auth-flow.md)
- [Debugging Transitions](./debugging-transitions.md)
- [API Reference](../api.md)
