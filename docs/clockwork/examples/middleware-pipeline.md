---
title: 'Clockwork Examples — Event Boundaries'
description: 'Validate and authorize input before sending domain events to an actor.'
---

## Event Boundaries

### Problem

External input needs logging and authorization, but Clockwork has no interceptor pipeline.

### Solution

Perform transport validation and authorization at the input boundary, then send accepted events to the actor.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'START' } | { type: 'RESET' };
const machine = defineMachine<Record<string, never>, Event>()({
  initial: 'idle',
  states: {
    idle: { on: { START: { target: 'active' } } },
    active: { on: { RESET: { target: 'idle' } } },
  },
});

const actor = machine.createActor();
const isEvent = (event: unknown): event is Event =>
  typeof event === 'object' && event !== null &&
  'type' in event && ((event as { type: unknown }).type === 'START' || (event as { type: unknown }).type === 'RESET');

const dispatch = (event: unknown, authorized: boolean) => {
  if (!isEvent(event)) return 'invalid';
  if (event.type === 'RESET' && !authorized) return 'denied';
  actor.send(event);
  return 'sent';
};

console.log(dispatch({ type: 'START' }, true)); // 'sent'
console.log(dispatch({ type: '__proto__' }, true)); // 'invalid'
console.log(dispatch({ type: 'RESET' }, false)); // 'denied'
console.log(actor.snapshot.state); // 'active'
actor.dispose();
```

### Pitfalls

- Put state-dependent admission rules in `guard`, not in a generic boundary.
- Do not add an interceptor abstraction around every actor without a concrete boundary need.

### Related

- [Permission-Based Access Control](./permission-based-access.md)
- [Multi-Machine Coordination](./multi-machine-coordination.md)
- [API Reference](../api.md)
