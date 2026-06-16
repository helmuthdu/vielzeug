---
title: Interceptor Pipeline
description: Intercept and transform events with pure interceptor functions.
---

## Interceptor Pipeline

### Problem

You need to intercept machine events for cross-cutting concerns — logging, analytics, authorization — without polluting state transition logic.

### Solution

Pass an `interceptors` array to `machine()`. Each interceptor is a pure function `(event, snapshot) => Ev | null`. Return the event (or a transformed event) to allow it; return `null` to block the chain:

```ts
import { machine, type InterceptorFn } from '@vielzeug/clockwork';

type Event = { type: 'ADMIN_ACTION' } | { type: 'GO' } | { type: 'STOP' };
type Context = { isAdmin: boolean };
type State = 'active' | 'idle';

// Logging interceptor — observes all events, passes them through
const logger: InterceptorFn<State, Context, Event> = (event, snapshot) => {
  console.log(`[${snapshot.state}] ${event.type}`);
  return event; // must return the event to allow it
};

// Authorization interceptor — blocks events based on context
const authGuard: InterceptorFn<State, Context, Event> = (event, snapshot) => {
  if (event.type === 'ADMIN_ACTION' && !snapshot.context.isAdmin) {
    console.warn('Blocked: insufficient permissions');
    return null; // null blocks the event
  }
  return event;
};

const config = {
  context: { isAdmin: false },
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
};

// Interceptors run left-to-right: logger runs first, then authGuard
const m = machine(config, { interceptors: [logger, authGuard] });

console.log(m.send({ type: 'ADMIN_ACTION' })); // 'rejected' — blocked by authGuard
console.log(m.send({ type: 'GO' })); // 'transitioned'

m[Symbol.dispose]();
```

### Pitfalls

- **Interceptors run left-to-right.** The first `null` in the chain stops all subsequent interceptors.
- **Returning `null` swallows the event silently.** `send()` returns `'rejected'`. Log or emit a signal if you need UI feedback.
- **Interceptors are synchronous.** Do not `await` inside interceptors; use entry/exit actions for async side effects.
- **Interceptors can transform events.** Return a new event object to change its type or payload before it reaches the machine.

### Related

- [Clockwork Examples](/clockwork/examples.md)
- [Debugging Transitions](./debugging-transitions.md)
