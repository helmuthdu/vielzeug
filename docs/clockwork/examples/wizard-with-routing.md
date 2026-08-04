---
title: 'Clockwork Examples — Multi-Step Wizard with Routing'
description: 'Synchronize explicit actor state with route changes.'
---

## Multi-Step Wizard with Routing

### Problem

A wizard needs to reflect state changes in the URL and accept validated route changes.

### Solution

Subscribe to committed snapshots to update the route, then send route-derived events from the router boundary.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type State = 'details' | 'review';
type Event = { type: 'NEXT' } | { type: 'PREVIOUS' } | { step: State; type: 'ROUTE' };

const wizard = defineMachine<Record<string, never>, Event>()({
  initial: 'details',
  states: {
    details: {
      on: {
        NEXT: { target: 'review' },
        ROUTE: { guard: ({ event }) => event.step === 'details', target: 'details' },
      },
    },
    review: {
      on: {
        PREVIOUS: { target: 'details' },
        ROUTE: { guard: ({ event }) => event.step === 'review', target: 'review' },
      },
    },
  },
});

const actor = wizard.createActor();
const stop = actor.subscribe(({ state }) => history.pushState(null, '', `/wizard/${state}`));
actor.send({ type: 'NEXT' });
console.log(actor.snapshot.state); // 'review'
stop();
actor.dispose();
```

### Pitfalls

- Validate path parameters before creating a `ROUTE` event.
- Prevent route feedback loops by checking the current URL before writing history.

### Related

- [Persisted Wizard](./persisted-wizard.md)
- [Model Nested Workflows with Flat States](./hierarchical-states.md)
- [API Reference](../api.md)
