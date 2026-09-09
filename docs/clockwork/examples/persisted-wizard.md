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
const states = new Set<State>(['info', 'details', 'confirm', 'success']);

function parseSnapshot(raw: string | null): MachineSnapshot<State, Context> | undefined {
  if (!raw) return undefined;

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return undefined;

    const candidate = value as { context?: unknown; state?: unknown };
    if (typeof candidate.state !== 'string' || !states.has(candidate.state as State)) return undefined;
    if (typeof candidate.context !== 'object' || candidate.context === null) return undefined;

    const context = candidate.context as Partial<Context>;
    if (typeof context.details !== 'string' || typeof context.email !== 'string' || typeof context.name !== 'string') {
      return undefined;
    }

    return { context: { details: context.details, email: context.email, name: context.name }, state: candidate.state as State };
  } catch {
    return undefined;
  }
}

const actor = wizard.createActor({ snapshot: parseSnapshot(sessionStorage.getItem(key)) });
const stop = actor.subscribe((next) => sessionStorage.setItem(key, JSON.stringify(next)));

actor.send({ email: 'ada@example.com', name: 'Ada', type: 'INFO' });
console.log(actor.snapshot.state); // 'details'
stop();
actor.dispose();
```

### Pitfalls

- Clockwork validates restored state names and plain-record context shape, not application-specific context fields.
- Store only serializable domain data and version your storage format.

### Related

- [Multi-Step Wizard with Routing](./wizard-with-routing.md)
- [Shopping Cart Checkout](./checkout.md)
- [API Reference](../api.md)
