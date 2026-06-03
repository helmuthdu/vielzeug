---
title: Middleware Pipeline
description: Intercept and transform events with composable middleware.
---

# Middleware Pipeline

Middleware functions intercept events before processing. Use them for logging, analytics, event filtering, or authorization:

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
