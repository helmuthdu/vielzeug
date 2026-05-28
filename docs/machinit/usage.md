---
title: Machinit — Usage Guide
description: Common patterns, best practices, and recipes for building state machines with Machinit.
---

[[toc]]

## Basic Usage

### Minimal Example

```ts
import { defineMachine, interpret } from '@vielzeug/machinit';

type Event = { type: 'TOGGLE' };

const machine = defineMachine<'on' | 'off', Record<string, never>, Event>({
  initial: 'on',
  states: {
    on: { on: { TOGGLE: [{ target: 'off' }] } },
    off: { on: { TOGGLE: [{ target: 'on' }] } },
  },
});

const m = interpret(machine);
m.send({ type: 'TOGGLE' }); // state changes to 'off'
```

### With Context

Context holds data that changes during transitions.

```ts
type Event = { type: 'INC' } | { type: 'DEC' };
type Context = { count: number };

const machine = defineMachine<'idle', Context, Event>({
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INC: [
          {
            target: 'idle',
            actions: [assign(({ context }) => ({ count: context.count + 1 }))],
          },
        ],
        DEC: [
          {
            target: 'idle',
            actions: [assign(({ context }) => ({ count: context.count - 1 }))],
          },
        ],
      },
    },
  },
});
```

## Transitions and Guards

### Basic Transitions

```ts
states: {
  idle: {
    on: {
      START: [{ target: 'running' }],
    },
  },
}
```

### Guarded Transitions

Guards decide whether a transition occurs based on context and event.

```ts
type Event = { type: 'SUBMIT'; value: number };

states: {
  form: {
    on: {
      SUBMIT: [
        {
          guard: ({ event }) => event.value > 0,
          target: 'processing',
          actions: [assign(({ event }) => ({ input: event.value }))],
        },
        // No matching guard → transition rejected
      ],
    },
  },
}
```

### Multiple Transitions for One Event

Process the first matching transition (guard passes).

```ts
states: {
  checkout: {
    on: {
      PAY: [
        {
          guard: ({ context }) => context.balance >= context.total,
          target: 'success',
          actions: [assign(({ context }) => ({ balance: context.balance - context.total }))],
        },
        {
          // Fallback if guard fails
          target: 'insufficient_funds',
        },
      ],
    },
  },
}
```

## Actions

Actions run during transitions. They modify context and have access to the current state and triggering event.

### Using assign()

`assign()` merges partial context updates.

```ts
import { assign } from '@vielzeug/machinit';

actions: [assign(({ context, event }) => ({ user: event.name, updated: Date.now() }))],
```

### Custom Actions

Actions are just functions that mutate context.

```ts
const logTransition = ({ context, event }: ActionArgs<Context, Event>) => {
  console.log(`Transition triggered by ${event.type}`);
  context.log = `Last event: ${event.type}`;
};

actions: [logTransition, assign(({ context }) => ({ processed: true }))],
```

## Entry and Exit Actions

Run actions when entering or leaving a state.

```ts
states: {
  active: {
    entry: ({ context }) => {
      console.log('Entered active state');
      context.startTime = Date.now();
    },
    exit: ({ context }) => {
      console.log('Exited active state, duration:', Date.now() - context.startTime);
    },
    on: {
      STOP: [{ target: 'idle' }],
    },
  },
}
```

## Async Invokes

Invokes run promises and dispatch events on completion or error.

### Basic Invoke

```ts
states: {
  loading: {
    invoke: [
      {
        src: async () => fetch('/api/data').then(r => r.json()),
        onDone: (result) => ({ type: 'DATA_READY', data: result }),
        onError: (error) => ({ type: 'DATA_ERROR', error: String(error) }),
      },
    ],
    on: {
      DATA_READY: [{ target: 'idle', actions: [assign(({ event }) => ({ data: event.data }))] }],
      DATA_ERROR: [{ target: 'error' }],
    },
  },
}
```

### Cancellation

Invokes are cancelled when exiting the state. Use `signal.aborted` to detect cancellation.

```ts
src: async ({ signal }) => {
  const response = await fetch('/data', { signal });
  return response.json();
},
```

### Access to Context and Event

```ts
src: async ({ context, event, signal }) => {
  // Use context to customize the request
  const url = `/api/${context.userId}/items?filter=${context.filter}`;
  const response = await fetch(url, { signal });
  return response.json();
},
```

## Context Validation

Validate context at initialization, hydration, and transitions.

```ts
type Context = { count: number; name: string };

const validator = (value: unknown): value is Context =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as any).count === 'number' &&
  typeof (value as any).name === 'string';

const machine = defineMachine<State, Context, Event>({
  context: { count: 0, name: 'app' },
  validateContext: validator,
  // ...
});
```

Invalid context throws `MachinitError` with code `MACHINIT_INVALID_VALIDATE_CONTEXT`.

## Persistence

Save and restore machine state using an adapter.

### Local Storage Example

```ts
const m = interpret(machine, {
  persistence: {
    load: () => {
      const data = localStorage.getItem('machine:state');
      return data ? JSON.parse(data) : undefined;
    },
    save: (snapshot) => {
      localStorage.setItem('machine:state', JSON.stringify(snapshot));
    },
    clear: () => {
      localStorage.removeItem('machine:state');
    },
  },
});
```

### Snapshot Validation

Validate restored context:

```ts
const m = interpret(machine, {
  persistence: { load, save, clear },
  validateSnapshot: validator,
});
```

## Debugging and Tracing

### Debug Hooks

Optional callbacks for observability (zero overhead when not used).

```ts
const m = interpret(machine, {
  debug: {
    onEvaluateGuard: (info) => {
      console.log(`Guard in ${info.from} for transition to ${info.target}: ${info.passed}`);
    },
    onTransitionSkipped: (info) => {
      console.log(`Event ${info.event.type} in ${info.from}: ${info.reason}`);
    },
    onInvokeStart: (info) => {
      console.log(`Started invoke in ${info.state}`);
    },
    onInvokeDone: (info) => {
      console.log(`Invoke completed:`, info.result);
    },
    onInvokeError: (info) => {
      console.log(`Invoke failed:`, info.error);
    },
    onInvokeAbort: (info) => {
      console.log(`Invoke aborted`);
    },
  },
});
```

### Trace Buffer

Keep a circular history of transitions.

```ts
const m = interpret(machine, { traceLimit: 50 });

m.send({ type: 'GO' });
m.send({ type: 'BACK' });

console.log(m.getTrace());
// [
//   { from: 'idle', to: 'active', event: { type: 'GO' }, timestamp: 1234567890, ... },
//   { from: 'active', to: 'idle', event: { type: 'BACK' }, timestamp: 1234567891, ... },
// ]
```

## Testing

### Pure Transition Resolution

`resolveTransition()` tests transition logic without side effects.

```ts
import { resolveTransition } from '@vielzeug/machinit';

const result = resolveTransition(machine, {
  state: 'idle',
  context: { authorized: false },
  event: { type: 'LOGIN', password: 'wrong' },
});

expect(result).toBeUndefined(); // Guard failed, no transition
```

### Checking Availability

Use `can()` to check if an event is acceptable.

```ts
const m = interpret(machine);

expect(m.can({ type: 'GO' })).toBe(true);
m.send({ type: 'GO' });
expect(m.can({ type: 'GO' })).toBe(false); // Already in target state
```

### Snapshot Testing

```ts
const m = interpret(machine);

const snapshot1 = m.getSnapshot();
m.send({ type: 'UPDATE', value: 10 });
const snapshot2 = m.getSnapshot();

expect(snapshot1).not.toEqual(snapshot2);
```

## Disposal

Always dispose machines when done to clean up subscriptions and abort ongoing invokes.

```ts
const m = interpret(machine);

// ... use machine

m[Symbol.dispose](); // Cleanup
// or with using (JavaScript 2024+)
// await using m = interpret(machine);
```

## Common Patterns

### Traffic Light

```ts
type Event = { type: 'NEXT' } | { type: 'EMERGENCY' };

const trafficLight = defineMachine<'red' | 'yellow' | 'green', Record<string, never>, Event>({
  initial: 'red',
  states: {
    red: {
      on: {
        NEXT: [{ target: 'green' }],
        EMERGENCY: [{ target: 'red' }],
      },
    },
    green: {
      on: {
        NEXT: [{ target: 'yellow' }],
        EMERGENCY: [{ target: 'red' }],
      },
    },
    yellow: {
      on: {
        NEXT: [{ target: 'red' }],
        EMERGENCY: [{ target: 'red' }],
      },
    },
  },
});
```

### Login Flow

```ts
type Context = { attempts: number; user?: { id: string; token: string } };
type Event =
  | { type: 'SUBMIT'; email: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_SUCCESS'; user: { id: string; token: string } }
  | { type: 'AUTH_FAILED' };

const auth = defineMachine<'unauthenticated' | 'loading' | 'authenticated' | 'error', Context, Event>({
  initial: 'unauthenticated',
  context: { attempts: 0 },
  states: {
    unauthenticated: {
      on: {
        SUBMIT: [
          {
            guard: ({ context }) => context.attempts < 3,
            target: 'loading',
            actions: [assign(({ context }) => ({ attempts: context.attempts + 1 }))],
          },
        ],
      },
    },
    loading: {
      invoke: [
        {
          src: async ({ event }) => {
            return fetch('/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email: event.email, password: event.password }),
            }).then(r => r.json());
          },
          onDone: (user) => ({ type: 'AUTH_SUCCESS', user }),
          onError: () => ({ type: 'AUTH_FAILED' }),
        },
      ],
      on: {
        AUTH_SUCCESS: [
          {
            target: 'authenticated',
            actions: [assign(({ event }) => ({ user: event.user }))],
          },
        ],
        AUTH_FAILED: [{ target: 'unauthenticated' }],
      },
    },
    authenticated: {
      on: {
        LOGOUT: [{ target: 'unauthenticated', actions: [assign(() => ({ user: undefined }))] }],
      },
    },
    error: {},
  },
});
```

### Timeout Pattern

```ts
type Context = { timeoutId?: NodeJS.Timeout };

states: {
  idle: {
    entry: ({ context }) => {
      context.timeoutId = setTimeout(() => {
        m.send({ type: 'TIMEOUT' });
      }, 5000);
    },
    exit: ({ context }) => {
      if (context.timeoutId) clearTimeout(context.timeoutId);
    },
    on: {
      ACTIVATE: [{ target: 'active' }],
    },
  },
}
```

## Best Practices

- **Define events as discriminated unions.** This ensures type safety and makes all possible events explicit.
- **Keep guards simple and pure.** Side effects belong in actions, not guards. Guards should only read context and event.
- **Use `assign()` for context updates.** It handles merging and is compatible with tracing and persistence.
- **Dispose machines when done.** Call `m[Symbol.dispose]()` to clean up invokes, listeners, and prevent memory leaks.
- **Test transitions with `resolveTransition()`.** It's a pure function; test transition logic independently without running the full machine.
- **Validate snapshots on restore.** Pass a `validateSnapshot` function to `interpret()` to ensure hydrated context is valid.
- **Use persistence only for data, not secrets.** Snapshots contain context; store them securely and never in localStorage for auth tokens.
- **Keep state machines simple and focused.** If a state machine has more than 10–15 states, consider splitting it or simplifying the domain logic.
