---
title: Middleware Pipeline
description: Intercept and transform events with composable middleware.
---

## Middleware Pipeline

### Problem

You need to intercept machine events for cross-cutting concerns — logging, analytics, authorization — without polluting state transition logic.

### Solution

Pass a `middleware` array to `interpret()`. Each middleware receives the event, a snapshot, and a `next()` function. Call `next()` to continue the chain; return `false` to swallow the event:

```ts
import { defineMachine, interpret, type MiddlewareFn } from '@vielzeug/clockwork';

type Event = { type: 'ADMIN_ACTION' } | { type: 'GO' } | { type: 'STOP' };
type Context = { isAdmin: boolean; log: string[] };
type State = 'active' | 'idle';

// Logging middleware — observes all events
const logger: MiddlewareFn<State, Context, Event> = (event, snapshot, next) => {
  console.log(`[${snapshot.state}] ${event.type}`);
  const result = next();
  console.log(`  → transition: ${result}`);
  return result;
};

// Authorization middleware — blocks certain events
const authGuard: MiddlewareFn<State, Context, Event> = (event, snapshot, next) => {
  if (event.type === 'ADMIN_ACTION' && !snapshot.context.isAdmin) {
    console.warn('Blocked: insufficient permissions');
    return false; // swallow event
  }
  return next();
};

const machine = defineMachine<State, Context, Event>({
  context: { isAdmin: false, log: [] },
  initial: 'idle',
  states: {
    active: { on: { STOP: { target: 'idle' } } },
    idle: {
      on: {
        ADMIN_ACTION: { target: 'active' },
        GO: { target: 'active' },
      },
    },
  },
});

// Middleware is composed right-to-left: logger wraps authGuard
const m = interpret(machine, { middleware: [logger, authGuard] });

m.send({ type: 'ADMIN_ACTION' }); // Blocked by authGuard
m.send({ type: 'GO' }); // Allowed — transitions to 'active'

m[Symbol.dispose]();
```

### Pitfalls

- **Middleware order matters** — Clockwork composes left-to-right: the first middleware in the array is the outermost wrapper.
- **Returning `false` swallows the event silently** — the machine stays in its current state. Emit a side-channel signal or log if you need UI feedback.
- **Middleware runs synchronously** — do not `await` inside middleware; use entry/exit actions for async side effects.

### Related

- [Clockwork Examples](/clockwork/examples.md)
- [Debugging Transitions](./debugging-transitions.md)
