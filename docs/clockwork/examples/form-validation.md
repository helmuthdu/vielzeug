---
title: 'Clockwork Examples — Form Validation'
description: 'Store submitted fields through replacement context and guard workflow advancement.'
---

## Form Validation

### Problem

A form step must retain entered values and reject advancement until they are valid.

### Solution

Send field values in events, reduce them into a new context, and guard the advancing transition.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { email: string; type: 'SET_EMAIL' } | { type: 'NEXT' } | { type: 'BACK' };

const form = defineMachine<{ email: string }, Event>()({
  context: { email: '' },
  initial: 'email',
  states: {
    email: {
      on: {
        SET_EMAIL: { reduce: ({ event }) => ({ email: event.email }), target: 'email' },
        NEXT: { guard: ({ context }) => context.email.includes('@'), target: 'review' },
      },
    },
    review: { on: { BACK: { target: 'email' }, NEXT: { target: 'submitted' } } },
    submitted: {},
  },
});

const actor = form.createActor();
actor.send({ email: 'ada@example.com', type: 'SET_EMAIL' });
actor.send({ type: 'NEXT' });
console.log(actor.snapshot.state); // 'review'
actor.dispose();
```

### Pitfalls

- A failed guard produces an `ignored` result and keeps the current snapshot.
- Do not write directly to `actor.snapshot.context`; reducers own context replacement.

### Related

- [Counter with Reset](./counter-with-reset.md)
- [Auth Flow with Guards](./auth-flow.md)
- [API Reference](../api.md)
