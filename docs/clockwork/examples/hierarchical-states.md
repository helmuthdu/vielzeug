---
title: 'Clockwork Examples — Model Nested Workflows with Flat States'
description: 'Represent nested workflow phases with explicit flat state names.'
---

## Model Nested Workflows with Flat States

### Problem

You need distinct editing phases without nested states or parent event bubbling.

### Solution

Name every phase as a flat state and make shared transitions explicit.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'CANCEL' } | { type: 'EDIT' } | { type: 'SAVE' } | { type: 'SAVED' };

const editor = defineMachine<Record<string, never>, Event>()({
  initial: 'idle',
  states: {
    idle: { on: { EDIT: { target: 'editingDraft' } } },
    editingDraft: {
      on: { CANCEL: { target: 'idle' }, SAVE: { target: 'editingSaving' } },
    },
    editingSaving: {
      on: { CANCEL: { target: 'editingDraft' }, SAVED: { target: 'idle' } },
    },
  },
});

const actor = editor.createActor();
actor.send({ type: 'EDIT' });
actor.send({ type: 'SAVE' });
console.log(actor.snapshot.state); // 'editingSaving'
actor.dispose();
```

### Pitfalls

- Clockwork state nodes cannot contain child states.
- Model independent concerns with separate actors rather than a hierarchy runtime.

### Related

- [Multi-Step Wizard with Routing](./wizard-with-routing.md)
- [Multi-Machine Coordination](./multi-machine-coordination.md)
- [API Reference](../api.md)
