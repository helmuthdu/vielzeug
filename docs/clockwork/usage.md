---
title: Clockwork — Usage Guide
description: Common patterns, best practices, and recipes for building state machines with Machine.
---

[[toc]]

## Basic Usage

### Minimal Example

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';

type Event = { type: 'TOGGLE' };

const machine = defineMachine<'off' | 'on', Record<string, never>, Event>({
  initial: 'on',
  states: {
    off: { on: { TOGGLE: { target: 'on' } } },
    on: { on: { TOGGLE: { target: 'off' } } },
  },
});

const m = interpret(machine);
m.send({ type: 'TOGGLE' }); // state changes to 'off'
```

### With Context

Context holds data that changes during transitions. Mutate it directly inside action functions:

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';

type Event = { type: 'DEC' } | { type: 'INC' };
type Context = { count: number };

const machine = defineMachine<'idle', Context, Event>({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DEC: { actions: [({ context }) => { context.count -= 1; }], target: 'idle' },
        INC: { actions: [({ context }) => { context.count += 1; }], target: 'idle' },
      },
    },
  },
});
```

::: tip Context is required when non-empty
When your context type has properties (e.g. `{ count: number }`), `context` is a required field in `defineMachine`. For stateless machines, use `Record<string, never>` and omit `context`.
:::

## Transition Syntax

### Shorthand — single transition

When there is exactly one possible transition for an event, pass it directly as an object:

```ts
states: {
  idle: {
    on: {
      GO: { target: 'active' },
    },
  },
}
```

### Array — multiple guarded transitions

When multiple transitions are possible (processed in order, first guard wins), use an array:

```ts
states: {
  checkout: {
    on: {
      PAY: [
        {
          guard: ({ context }) => context.balance >= context.total,
          actions: [({ context }) => { context.balance -= context.total; }],
          target: 'success',
        },
        {
          // fallback when guard fails
          target: 'insufficient_funds',
        },
      ],
    },
  },
}
```

## Guards

Guards decide whether a transition occurs based on current context and the event payload.

```ts
type Event = { type: 'SUBMIT'; value: number };

states: {
  form: {
    on: {
      SUBMIT: {
        guard: ({ event }) => event.value > 0,
        actions: [({ context, event }) => { context.input = event.value; }],
        target: 'processing',
      },
    },
  },
}
```

::: tip
Guards must be pure functions. Side effects belong in `actions`, not `guard`.
:::

## Actions

Actions run during transitions to update context. Multiple actions execute in order. Actions receive a mutable context draft and the readonly event:

```ts
import type { ActionFn } from '@vielzeug/clockwork';

const logEvent: ActionFn<Context, Event> = ({ context, event }) => {
  context.lastEvent = event.type;
  context.updatedAt = Date.now();
};

// Use in transition:
actions: [logEvent, ({ context }) => { context.processed = true; }],
```

For partial shallow-merge style updates, spread into the context:

```ts
actions: [({ context, event }) => {
  Object.assign(context, { count: context.count + event.amount, updatedAt: Date.now() });
}],
```

## Entry and Exit Actions

`entry` and `exit` run when a state is entered or left. Both fire on self-transitions too. They receive `{ context, event }` where `event` may be a `LifecycleEvent` (`$init`, `$hydrate`, or `$after`):

```ts
states: {
  active: {
    entry: ({ context }) => {
      context.startTime = Date.now();
    },
    exit: ({ context }) => {
      context.duration = Date.now() - context.startTime;
    },
    on: {
      STOP: { target: 'idle' },
    },
  },
}
```

## Async Invokes

Invokes run a Promise when a state is entered and dispatch an event when it settles.

### Basic invoke

```ts
states: {
  loading: {
    invoke: [
      {
        src: async ({ signal }) => fetch('/api/data', { signal }).then(r => r.json()),
        onDone: (result) => ({ type: 'DATA_READY', data: result }),
        onError: (error) => ({ type: 'DATA_ERROR', message: String(error) }),
      },
    ],
    on: {
      DATA_READY: { actions: [({ context, event }) => { context.data = event.data; }], target: 'idle' },
      DATA_ERROR: { target: 'error' },
    },
  },
}
```

### Cancellation with `AbortSignal`

Invokes are automatically aborted when the state is exited. Pass `signal` to fetch or any `AbortSignal`-aware API:

```ts
src: async ({ context, signal }) => {
  const response = await fetch(`/api/${context.userId}/items`, { signal });
  return response.json();
},
```

### Multiple invokes

A state can run multiple invokes in parallel:

```ts
invoke: [
  { src: async () => fetchUser(), onDone: (user) => ({ type: 'USER_LOADED', user }) },
  { src: async () => fetchPermissions(), onDone: (perms) => ({ type: 'PERMS_LOADED', perms }) },
],
```

### Context capture

Invoke callbacks (`onDone`, `onError`) receive the context as it was at the time the invoke was **started**, not when the promise resolves. This prevents stale-context bugs when the machine has transitioned between invoke creation and resolution.

```ts
onDone: (result, { context }) => {
  // `context` is a snapshot from when the invoke started
  return { type: 'DONE', originalState: context.status };
},
```

## Delayed Transitions (After)

Schedule automatic transitions after a delay. After-timers are cancelled when the state is exited.

### Basic delay

```ts
states: {
  notification: {
    after: [{ delay: 5000, target: 'dismissed' }],
  },
  dismissed: {},
}
```

### With guard and actions

```ts
states: {
  idle: {
    after: [
      {
        delay: 3000,
        guard: ({ context }) => context.autoClose,
        actions: [({ context }) => { context.closedAt = Date.now(); }],
        target: 'closed',
      },
    ],
  },
}
```

### After + Invoke interaction

When a state has both `after` and `invoke`, the after-timer is cleared if the state is exited via an invoke result:

```ts
states: {
  loading: {
    after: [{ delay: 10000, target: 'timeout' }],
    invoke: [{
      src: async ({ signal }) => fetch('/api', { signal }).then(r => r.json()),
      onDone: (data) => ({ type: 'DONE', data }),
    }],
    on: { DONE: { target: 'success' } },
  },
  timeout: {},
  success: {},
}
```

## Hierarchical States

Compound states contain nested substates. A compound state must have an `initial` property pointing to one of its children.

### Basic hierarchy

```ts
const machine = defineMachine<'idle' | 'active', { mode: string }, Event>({
  context: { mode: '' },
  initial: 'active',
  states: {
    idle: {},
    active: {
      initial: 'editing',
      states: {
        editing: { on: { SAVE: { target: 'active.saving' } } },
        saving: { on: { DONE: { target: 'idle' } } },
      },
    },
  },
});

// Entering 'active' automatically resolves to 'active.editing'
const m = interpret(machine);
console.log(m.state.value); // 'active.editing'
```

### Leaf resolution

When targeting a compound state, the machine automatically descends to the deepest `initial` leaf:

```ts
// target: 'active' resolves to 'active.editing'
on: { RESTART: { target: 'active' } }
```

### `matches()` with hierarchy

`matches()` returns `true` for ancestor states too:

```ts
m.matches('active');         // true when in 'active.editing' or 'active.saving'
m.matches('active.editing'); // true only when in 'active.editing'
```

## Context Validation

Validate context at initialization and on every transition:

```ts
type Context = { count: number; name: string };

const machine = defineMachine<'idle', Context, Event>({
  context: { count: 0, name: 'app' },
  initial: 'idle',
  validateContext: (ctx) => typeof ctx.count === 'number' && typeof ctx.name === 'string',
  states: { idle: {} },
});
```

When validation fails, a `MachineError` with code `MACHINE_INVALID_VALIDATE_CONTEXT` is thrown. The machine state and context are **unchanged** — the transition is rolled back before any signals are updated.

## Persistence

Save and restore machine state across sessions using a persistence adapter.

### Local Storage

```ts
import type { MachineSnapshot } from '@vielzeug/clockwork';

const m = interpret(machine, {
  persistence: {
    load: () => {
      const raw = localStorage.getItem('clockwork:state');
      return raw ? (JSON.parse(raw) as MachineSnapshot<State, Context>) : undefined;
    },
    save: (snapshot) => {
      localStorage.setItem('clockwork:state', JSON.stringify(snapshot));
    },
    clear: () => {
      localStorage.removeItem('clockwork:state');
    },
  },
});
```

### Hydration behavior

On creation, `interpret()` checks `options.snapshot` first, then `persistence.load()`. If a persisted snapshot exists, the machine hydrates from it — entry hooks run, invokes start, and after-timers schedule.

::: warning Disposal and clearing
`m[Symbol.dispose]()` does **not** clear persisted state. The machine may be recreated (e.g. after HMR or component remount) and should resume from the last saved state.
:::

## Middleware

Middleware functions intercept events before they are processed. Each middleware receives the event, a snapshot of the current state, and a `next` function to continue:

```ts
import type { MiddlewareFn } from '@vielzeug/clockwork';

const logger: MiddlewareFn<State, Context, Event> = (event, snapshot, next) => {
  console.log(`[${snapshot.state}] processing ${event.type}`);
  const result = next();
  console.log(`  → transition occurred: ${result}`);
  return result;
};

const blocker: MiddlewareFn<State, Context, Event> = (event, _snapshot, next) => {
  if (event.type === 'BLOCKED') return false; // swallow event
  return next();
};

const m = interpret(machine, { middleware: [logger, blocker] });
```

Middleware is composed right-to-left: the first middleware in the array is the outermost wrapper.

## Checking State

### `matches()` — check multiple states at once

```ts
const m = interpret(machine);

m.matches('idle');              // true if current state is 'idle'
m.matches('loading', 'error'); // true if in either state (or a child of either)
```

### `can()` — check if an event is valid right now

```ts
m.can({ type: 'SUBMIT' }); // true if a transition exists for SUBMIT in the current state
```

::: tip
`can()` evaluates guards against the current context but does **not** fire any debug hooks. It is a pure read — use it freely for UI conditional rendering.
:::

## Subscribe

Subscribe to state/context changes without using `@vielzeug/ripple` directly:

```ts
const unsub = m.subscribe(({ state, context }) => {
  console.log(`State: ${state}, count: ${context.count}`);
});

m.send({ type: 'INC' }); // triggers callback

unsub(); // stop listening
```

The callback fires only when `state` or `context` reference changes — not on every signal read.

## Debugging and Tracing

### Debug events

The `onDebug` callback receives a discriminated union of debug events:

```ts
const m = interpret(machine, {
  debug: {
    onDebug: (event) => {
      switch (event.type) {
        case 'guard':
          console.log(`Guard: ${event.from} → ${event.target} = ${event.passed}`);
          break;
        case 'transition-skipped':
          console.log(`${event.event.type} in ${event.from}: no matching transition`);
          break;
        case 'invoke-start':
          console.log(`invoke #${event.invokeId} started in ${event.state}`);
          break;
        case 'invoke-done':
          console.log(`invoke #${event.invokeId} done:`, event.result);
          break;
        case 'invoke-error':
          console.error(`invoke #${event.invokeId} failed:`, event.error);
          break;
        case 'invoke-abort':
          console.log(`invoke #${event.invokeId} aborted`);
          break;
      }
    },
  },
});
```

### `onTransition` callback

For lightweight observation without full debug events:

```ts
const m = interpret(machine, {
  debug: {
    onTransition: ({ from, to, event }) => {
      analytics.track('state_change', { from, to, event: event.type });
    },
  },
});
```

### Transition trace buffer

Keep a ring buffer of the last N transitions:

```ts
const m = interpret(machine, { debug: { traceLimit: 50 } });

m.send({ type: 'GO' });
m.send({ type: 'BACK' });

console.log(m.getTrace());
// [
//   { from: 'idle', to: 'active', event: { type: 'GO' }, timestamp: 1234567890 },
//   { from: 'active', to: 'idle', event: { type: 'BACK' }, timestamp: 1234567891 },
// ]
```

When the buffer is full, the oldest entry is overwritten. The array returned by `getTrace()` is always in chronological order. Each call returns fresh cloned entries — mutating them does not affect the internal buffer.

## Testing

### Pure transition resolution

`resolveTransition()` is a pure function — it resolves which `TransitionDef` would apply without running any actions, entry/exit handlers, or invokes:

```ts
import { resolveTransition } from '@vielzeug/clockwork';

const transition = resolveTransition(machine, {
  context: { authorized: false },
  event: { type: 'LOGIN' },
  state: 'idle',
});

expect(transition).toBeUndefined(); // guard failed
```

When a transition matches, the resolved `TransitionDef` is returned directly:

```ts
const transition = resolveTransition(machine, {
  context: { authorized: true },
  event: { type: 'LOGIN' },
  state: 'idle',
});

expect(transition?.target).toBe('dashboard');
```

### Snapshot testing

```ts
const m = interpret(machine);

const before = m.getSnapshot();
m.send({ type: 'UPDATE', value: 10 });
const after = m.getSnapshot();

expect(before.context.value).toBe(0);
expect(after.context.value).toBe(10);
```

## Disposal

Always dispose machines to clean up signals, abort in-flight invokes, and clear after-timers.

```ts
const m = interpret(machine);

// ... use machine

m[Symbol.dispose](); // aborts invokes, clears timers, disposes reactive signals

// Or with the explicit resource management proposal (ES2024+):
{
  using m = interpret(machine);
  m.send({ type: 'GO' });
} // m[Symbol.dispose]() called automatically
```

::: warning
Disposal does **not** clear persisted state. The machine may resume from the last snapshot on recreation.
:::

## Common Patterns

### Traffic Light

```ts
type Event = { type: 'EMERGENCY' } | { type: 'NEXT' };

const trafficLight = defineMachine<'green' | 'red' | 'yellow', Record<string, never>, Event>({
  initial: 'red',
  states: {
    green:  { on: { EMERGENCY: { target: 'red' }, NEXT: { target: 'yellow' } } },
    red:    { on: { EMERGENCY: { target: 'red' }, NEXT: { target: 'green'  } } },
    yellow: { on: { EMERGENCY: { target: 'red' }, NEXT: { target: 'red'    } } },
  },
});
```

### Auto-dismiss notification

```ts
type Event = { type: 'DISMISS' } | { type: 'SHOW'; message: string };

const notification = defineMachine<'hidden' | 'visible', { message: string }, Event>({
  context: { message: '' },
  initial: 'hidden',
  states: {
    hidden: {
      on: {
        SHOW: {
          actions: [({ context, event }) => { context.message = event.message; }],
          target: 'visible',
        },
      },
    },
    visible: {
      after: [{ delay: 5000, target: 'hidden' }],
      on: { DISMISS: { target: 'hidden' } },
    },
  },
});
```

### Auth flow with async login

```ts
type Context = { attempts: number; user?: { id: string; token: string } };
type Event =
  | { email: string; password: string; type: 'SUBMIT' }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_SUCCESS'; user: { id: string; token: string } }
  | { type: 'AUTH_FAILED' };

const auth = defineMachine<'authenticated' | 'error' | 'loading' | 'unauthenticated', Context, Event>({
  context: { attempts: 0 },
  initial: 'unauthenticated',
  states: {
    authenticated: {
      on: {
        LOGOUT: { actions: [({ context }) => { context.user = undefined; }], target: 'unauthenticated' },
      },
    },
    error: {},
    loading: {
      invoke: [
        {
          onDone: (user) => ({ type: 'AUTH_SUCCESS', user: user as { id: string; token: string } }),
          onError: () => ({ type: 'AUTH_FAILED' }),
          src: async ({ context, entryEvent, signal }) => {
            if (entryEvent.type !== 'SUBMIT') throw new Error('unexpected');
            const resp = await fetch('/auth/login', {
              body: JSON.stringify({ email: entryEvent.email, password: entryEvent.password }),
              method: 'POST',
              signal,
            });
            return resp.json();
          },
        },
      ],
      on: {
        AUTH_FAILED: { target: 'unauthenticated' },
        AUTH_SUCCESS: { actions: [({ context, event }) => { context.user = event.user; }], target: 'authenticated' },
      },
    },
    unauthenticated: {
      on: {
        SUBMIT: {
          actions: [({ context }) => { context.attempts += 1; }],
          guard: ({ context }) => context.attempts < 3,
          target: 'loading',
        },
      },
    },
  },
});
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef, useState } from 'react';
import { defineMachine, interpret } from '@vielzeug/clockwork';

function TrafficLight() {
  const machineRef = useRef<ReturnType<typeof interpret> | null>(null);
  const [state, setState] = useState('red');

  useEffect(() => {
    const m = interpret(trafficMachine);
    machineRef.current = m;
    const unsub = m.subscribe(({ state }) => setState(state));
    return () => { unsub(); m[Symbol.dispose](); };
  }, []);

  return (
    <div>
      <p>Current: {state}</p>
      <button onClick={() => machineRef.current?.send({ type: 'NEXT' })}>Next</button>
    </div>
  );
}
```

```ts [Vue 3]
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { interpret } from '@vielzeug/clockwork';
import { trafficMachine } from './machine';

const state = ref('red');
let m: ReturnType<typeof interpret>;
let unsub: (() => void) | undefined;

onMounted(() => {
  m = interpret(trafficMachine);
  unsub = m.subscribe(({ state: s }) => { state.value = s; });
});

onUnmounted(() => {
  unsub?.();
  m?.[Symbol.dispose]();
});
</script>

<template>
  <div>
    <p>Current: {{ state }}</p>
    <button @click="m?.send({ type: 'NEXT' })">Next</button>
  </div>
</template>
```

:::

## Working with Other Vielzeug Libraries

### With `@vielzeug/ripple`

`state` and `context` are `ReadonlySignal` values from `@vielzeug/ripple`. Use `effect()` to drive reactive UI from machine state:

```ts
import { effect } from '@vielzeug/ripple';
import { defineMachine, interpret } from '@vielzeug/clockwork';

const m = interpret(playerMachine);

effect(() => {
  document.getElementById('play-btn')!.textContent =
    m.state.value === 'playing' ? 'Pause' : 'Play';
});

m.send({ type: 'PLAY' }); // effect runs immediately
```

### With `@vielzeug/herald`

Bridge machine transitions to a shared event bus for cross-machine coordination:

```ts
import { createBus } from '@vielzeug/herald';
import { interpret } from '@vielzeug/clockwork';

const bus = createBus<{ 'auth:login': { userId: string }; 'auth:logout': void }>();

const m = interpret(authMachine, {
  debug: {
    onTransition: ({ to }) => {
      if (to === 'anonymous') bus.emit('auth:logout', undefined);
    },
  },
});
```

## Best Practices

- **Use discriminated event unions.** TypeScript infers payload types per transition from the event type string.
- **Keep guards pure.** Guards must not produce side effects. All mutation belongs in `actions`.
- **Mutate context directly in actions.** Actions receive a cloned draft — mutate it in place.
- **Prefer shorthand transition syntax** (`on: { GO: { target: 'active' } }`) for single transitions. Use arrays only when you need multiple guarded alternatives.
- **Dispose machines when done.** Always call `m[Symbol.dispose]()` to prevent memory leaks and abort dangling invokes.
- **Test with `resolveTransition()`.** Unit-test guard logic in isolation without spinning up a full machine instance.
- **Keep machines focused.** A machine with more than 10–15 states is usually a sign it should be split.
- **Use after for timeouts.** Prefer `after` over manual setTimeout in entry hooks — timers are automatically cleaned up on state exit.
