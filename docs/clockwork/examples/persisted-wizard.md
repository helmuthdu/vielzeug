---
title: 'Clockwork Examples — Persisted Wizard'
description: 'Persist validated actor snapshots at the application boundary.'
---

## Persisted Wizard

### Problem

A multi-step workflow must resume after a reload without built-in runtime persistence.

### Solution

Validate stored data yourself, pass it as `createActor({ snapshot })`, and persist committed snapshots from a subscription.

```ts
import { defineMachine, type MachineSnapshot } from '@vielzeug/clockwork';

type State = 'info' | 'details' | 'confirm' | 'success';
type Context = { details: string; email: string; name: string };
type Event = { type: 'BACK' } | { details: string; type: 'DETAILS' } | { email: string; name: string; type: 'INFO' } | { type: 'CONFIRM' };

const wizard = defineMachine<Context, Event>()({
  context: { details: '', email: '', name: '' },
  initial: 'info',
  states: {
    info: { on: { INFO: { reduce: ({ context, event }) => ({ ...context, email: event.email, name: event.name }), target: 'details' } } },
    details: { on: { BACK: { target: 'info' }, DETAILS: { reduce: ({ context, event }) => ({ ...context, details: event.details }), target: 'confirm' } } },
    confirm: { on: { BACK: { target: 'details' }, CONFIRM: { target: 'success' } } },
    success: {},
  },
});

const key = 'wizard-snapshot';
const parsed = JSON.parse(sessionStorage.getItem(key) ?? 'null') as MachineSnapshot<State, Context> | null;
const snapshot = parsed?.state && parsed.context ? parsed : undefined;
const actor = wizard.createActor({ snapshot });
const stop = actor.subscribe((next) => sessionStorage.setItem(key, JSON.stringify(next)));

actor.send({ email: 'ada@example.com', name: 'Ada', type: 'INFO' });
console.log(actor.snapshot.state); // 'details'
stop();
actor.dispose();
```

### Pitfalls

- Clockwork validates restored state names, not your persisted context fields.
- Store only serializable domain data and version your storage format.

### Related

- [Multi-Step Wizard with Routing](./wizard-with-routing.md)
- [Shopping Cart Checkout](./checkout.md)
- [API Reference](../api.md)
