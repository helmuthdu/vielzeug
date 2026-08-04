---
title: 'Clockwork Examples — Multi-Machine Coordination'
description: 'Coordinate independent actors through an explicit application boundary.'
---

## Multi-Machine Coordination

### Problem

A session transition must update a separate notification workflow without machines importing each other.

### Solution

Subscribe at the application boundary and send a domain event to the other actor after the source commits.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type SessionEvent = { type: 'LOGIN' } | { type: 'LOGOUT' };
type NoticeEvent = { type: 'HIDE' } | { type: 'SHOW' };

const session = defineMachine<Record<string, never>, SessionEvent>()({
  initial: 'idle',
  states: { idle: { on: { LOGIN: { target: 'active' } } }, active: { on: { LOGOUT: { target: 'idle' } } } },
}).createActor();
const notice = defineMachine<Record<string, never>, NoticeEvent>()({
  initial: 'hidden',
  states: { hidden: { on: { SHOW: { target: 'visible' } } }, visible: { on: { HIDE: { target: 'hidden' } } } },
}).createActor();

const stop = session.subscribe((snapshot) => {
  if (snapshot.state === 'active') notice.send({ type: 'SHOW' });
});

session.send({ type: 'LOGIN' });
console.log(notice.snapshot.state); // 'visible'
stop();
session.dispose();
notice.dispose();
```

### Pitfalls

- Keep event flow directed; cyclic subscriptions can create feedback loops.
- `maxTransitions` protects an actor from loops but is not normal control flow.

### Related

- [Model Nested Workflows with Flat States](./hierarchical-states.md)
- [Event Boundaries](./middleware-pipeline.md)
- [API Reference](../api.md)
