---
title: 'Clockwork Examples — Debugging Transitions'
description: 'Observe committed actor snapshots and keep application history without core tracing.'
---

## Debugging Transitions

### Problem

You need development-time visibility into committed snapshots and state history.

### Solution

Attach `debugActor()` to an actor and subscribe at the application boundary for history. The devtool receives snapshots only.

```ts
import { defineMachine } from '@vielzeug/clockwork';
import { debugActor } from '@vielzeug/clockwork/devtools';

type Event = { type: 'SUBMIT' } | { type: 'PAY' };
const machine = defineMachine<Record<string, never>, Event>()({
  initial: 'pending',
  states: {
    pending: { on: { SUBMIT: { target: 'confirmed' } } },
    confirmed: { on: { PAY: { target: 'paid' } } },
    paid: {},
  },
});

const actor = machine.createActor();
const history: string[] = [];
const stopDebugging = debugActor(actor);
const stop = actor.subscribe((snapshot) => history.push(snapshot.state));

actor.send({ type: 'SUBMIT' });
actor.send({ type: 'PAY' });
console.log(actor.snapshot.state); // 'paid'
console.log(history); // ['confirmed', 'paid']

stopDebugging();
stop();
actor.dispose();
```

### Pitfalls

- Import `debugActor` from `@vielzeug/clockwork/devtools`, not the package root.
- `debugActor` observes snapshots only; keep send and error diagnostics at your application boundary.
- Clockwork has no built-in trace buffer; keep history in your tooling boundary.

### Related

- [Pure Transition Testing](./unit-testing.md)
- [Media Player](./media-player.md)
- [API Reference](../api.md)
