---
title: 'Clockwork Examples — Counter with Reset'
description: 'Update replacement context through self-transitions.'
---

## Counter with Reset

### Problem

You need to update a value without changing the workflow state.

### Solution

Use self-transitions and return a replacement context from every reducer.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'DEC' } | { type: 'INC' } | { type: 'RESET' };

const counter = defineMachine<{ count: number }, Event>()({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DEC: { reduce: ({ context }) => ({ count: context.count - 1 }), target: 'idle' },
        INC: { reduce: ({ context }) => ({ count: context.count + 1 }), target: 'idle' },
        RESET: { reduce: () => ({ count: 0 }), target: 'idle' },
      },
    },
  },
});

const actor = counter.createActor();
actor.send({ type: 'INC' });
actor.send({ type: 'INC' });
console.log(actor.snapshot.context.count); // 2
actor.send({ type: 'RESET' });
console.log(actor.snapshot.context.count); // 0
actor.dispose();
```

### Pitfalls

- Do not mutate `context`; return the complete next context.
- A self-transition still runs its exit, transition, and entry effects.

### Related

- [Form Validation](./form-validation.md)
- [Pure Transition Testing](./unit-testing.md)
- [API Reference](../api.md)
