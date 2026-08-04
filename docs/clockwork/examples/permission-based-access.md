---
title: 'Clockwork Examples — Permission-Based Access Control'
description: 'Gate state changes with authorization guards at transition selection.'
---

## Permission-Based Access Control

### Problem

A workflow must allow only the role that owns each domain action.

### Solution

Keep the role in context and use pure guards to select allowed transitions.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { payload: Record<string, unknown>; type: 'SUBMIT' } | { type: 'APPROVE' };
type Context = { role: 'reviewer' | 'submitter'; submission: Record<string, unknown> };
const can = (role: Context['role'], action: 'approve' | 'submit') => role === 'reviewer' ? action === 'approve' : action === 'submit';

const approval = defineMachine<Context, Event>()({
  context: { role: 'submitter', submission: {} },
  initial: 'draft',
  states: {
    draft: {
      on: {
        SUBMIT: {
          guard: ({ context }) => can(context.role, 'submit'),
          reduce: ({ context, event }) => ({ ...context, submission: event.payload }),
          target: 'review',
        },
      },
    },
    review: { on: { APPROVE: { guard: ({ context }) => can(context.role, 'approve'), target: 'approved' } } },
    approved: {},
  },
});

const actor = approval.createActor();
console.log(actor.can({ payload: { title: 'Proposal' }, type: 'SUBMIT' })); // true
actor.send({ payload: { title: 'Proposal' }, type: 'SUBMIT' });
console.log(actor.snapshot.state); // 'review'
actor.dispose();
```

### Pitfalls

- A guard is a client-side workflow rule, not server-side authorization.
- A failed guard results in `ignored`; report denial at the application boundary.

### Related

- [Auth Flow with Guards](./auth-flow.md)
- [Event Boundaries](./middleware-pipeline.md)
- [API Reference](../api.md)
