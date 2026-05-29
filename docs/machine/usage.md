---
title: Machine — Usage Guide
description: Common patterns, best practices, and recipes for building state machines with Machine.
---

[[toc]]

## Basic Usage

### Minimal Example

```ts
import { defineMachine, interpret } from '@vielzeug/machine';

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

Context holds data that changes during transitions. Use `assign()` to update it.

```ts
import { assign, defineMachine, interpret } from '@vielzeug/machine';

type Event = { type: 'DEC' } | { type: 'INC' };
type Context = { count: number };

const machine = defineMachine<'idle', Context, Event>({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DEC: { actions: [assign(({ context }) => ({ count: context.count - 1 }))], target: 'idle' },
        INC: { actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' },
      },
    },
  },
});
```

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
          actions: [assign(({ context }) => ({ balance: context.balance - context.total }))],
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
        actions: [assign(({ event }) => ({ input: event.value }))],
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

Actions run during transitions to update context. Multiple actions execute in order.

### `assign()`

`assign()` shallow-merges partial context updates. For nested objects, spread explicitly:

```ts
import { assign } from '@vielzeug/machine';

// Flat context update
actions: [assign(({ context }) => ({ count: context.count + 1 }))],

// Nested context — spread the nested property
actions: [assign(({ context }) => ({ config: { ...context.config, debug: true } }))],
```

### Custom actions

Actions are plain functions that mutate the context draft:

```ts
import type { ActionArgs } from '@vielzeug/machine';

const logEvent = ({ context, event }: ActionArgs<Context, Event>) => {
  context.lastEvent = event.type;
  context.updatedAt = Date.now();
};

actions: [logEvent, assign(({ context }) => ({ processed: true }))],
```

## Entry and Exit Actions

`entry` runs when a state is entered. `exit` runs when a state is left. Both fire on self-transitions too.

Entry receives only `{ context }` — it does not receive the triggering event. For event-dependent logic on transition, use transition `actions` instead.

```ts
states: {
  active: {
    entry: ({ context }) => {
      context.startTime = Date.now();
    },
    exit: ({ context, event }) => {
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
        src: async () => fetch('/api/data').then(r => r.json()),
        onDone: (result) => ({ type: 'DATA_READY', data: result }),
        onError: (error) => ({ type: 'DATA_ERROR', message: String(error) }),
      },
    ],
    on: {
      DATA_READY: { actions: [assign(({ event }) => ({ data: event.data }))], target: 'idle' },
      DATA_ERROR:  { target: 'error' },
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

## Context Validation

Validate context at initialization, hydration, and on every transition.

```ts
type Context = { count: number; name: string };

const isValidContext = (value: unknown): value is Context =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Context).count === 'number' &&
  typeof (value as Context).name === 'string';

const machine = defineMachine<State, Context, Event>({
  context: { count: 0, name: 'app' },
  validateContext: isValidContext,
  // ...
});
```

When validation fails, a `MachineError` with code `MACHINE_INVALID_VALIDATE_CONTEXT` is thrown. The machine state and context are **unchanged** — the transition is rolled back before any signals are updated.

## Persistence

Save and restore machine state across sessions using a persistence adapter.

### Local Storage

```ts
const m = interpret(machine, {
  persistence: {
    load: () => {
      const raw = localStorage.getItem('machine:state');
      return raw ? (JSON.parse(raw) as MachineSnapshot<State, Context>) : undefined;
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

### Snapshot validation

Validate restored context on hydration to guard against stale or corrupt storage:

```ts
const m = interpret(machine, {
  persistence: { load, save, clear },
  validateSnapshot: isValidContext,
});
```

### Explicit persistence clearing

Disposal does **not** clear persistence — the machine may be recreated (e.g. after HMR or component remount) and should resume from the last saved state. Call `clearPersistence()` explicitly when you want to reset:

```ts
m.clearPersistence(); // removes stored snapshot via adapter.clear()
```

## Checking State

### `matches()` — check multiple states at once

```ts
const m = interpret(machine);

m.matches('idle');              // true if current state is 'idle'
m.matches('loading', 'error'); // true if in either state
```

### `can()` — check if an event is valid right now

```ts
m.can({ type: 'SUBMIT' }); // true if a transition exists for SUBMIT in the current state
```

::: tip
`can()` evaluates guards against the current context but does **not** fire any debug hooks. It is a pure read — use it freely for UI conditional rendering.
:::

## Debugging and Tracing

### Debug hooks

Optional callbacks for observability. They have zero overhead when not provided.

```ts
const m = interpret(machine, {
  debug: {
    onEvaluateGuard: ({ from, target, passed }) => {
      console.log(`Guard: ${from} → ${target} = ${passed}`);
    },
    onTransitionSkipped: ({ event, from }) => {
      console.log(`${event.type} in ${from}: no matching transition`);
    },
    onInvokeStart: ({ state, invokeId }) => console.log(`invoke #${invokeId} started in ${state}`),
    onInvokeDone:  ({ invokeId, result })  => console.log(`invoke #${invokeId} done`, result),
    onInvokeError: ({ invokeId, error })   => console.error(`invoke #${invokeId} failed`, error),
    onInvokeAbort: ({ invokeId })          => console.log(`invoke #${invokeId} aborted`),
  },
});
```

### `onTransition` callback

For lightweight observation without full debug hooks, use `onTransition` in `InterpretOptions`:

```ts
const m = interpret(machine, {
  onTransition: ({ from, to, event }) => {
    analytics.track('state_change', { from, to, event: event.type });
  },
});
```

### Transition trace buffer

Keep a ring buffer of the last N transitions:

```ts
const m = interpret(machine, { traceLimit: 50 });

m.send({ type: 'GO' });
m.send({ type: 'BACK' });

console.log(m.getTrace());
// [
//   { from: 'idle', to: 'active', event: { type: 'GO' }, timestamp: 1234567890 },
//   { from: 'active', to: 'idle', event: { type: 'BACK' }, timestamp: 1234567891 },
// ]
```

When the buffer is full, the oldest entry is overwritten. The array returned by `getTrace()` is always in chronological order.

## Testing

### Pure transition resolution

`resolveTransition()` is a pure function — it resolves which `TransitionDef` would apply without running any actions, entry/exit handlers, or invokes. Use it to unit-test guard logic:

```ts
import { resolveTransition } from '@vielzeug/machine';

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

Always dispose machines to clean up signals and abort any in-flight invokes.

```ts
const m = interpret(machine);

// ... use machine

m[Symbol.dispose](); // aborts invokes, disposes reactive signals

// Or with the explicit resource management proposal (ES2024+):
{
  using m = interpret(machine);
  m.send({ type: 'GO' });
} // m[Symbol.dispose]() called automatically
```

::: warning
Disposal does **not** clear persisted state. Call `m.clearPersistence()` explicitly if you want to remove the stored snapshot.
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
        LOGOUT: { actions: [assign(() => ({ user: undefined }))], target: 'unauthenticated' },
      },
    },
    error: {},
    loading: {
      invoke: [
        {
          onDone:  (user)  => ({ type: 'AUTH_SUCCESS', user: user as { id: string; token: string } }),
          onError: ()      => ({ type: 'AUTH_FAILED' }),
          src: async ({ event }) => {
            if (event.type !== 'SUBMIT') throw new Error('unexpected');
            return fetch('/auth/login', {
              body: JSON.stringify({ email: event.email, password: event.password }),
              method: 'POST',
            }).then(r => r.json());
          },
        },
      ],
      on: {
        AUTH_FAILED:  { target: 'unauthenticated' },
        AUTH_SUCCESS: { actions: [assign(({ event }) => ({ user: event.user }))], target: 'authenticated' },
      },
    },
    unauthenticated: {
      on: {
        SUBMIT: {
          actions: [assign(({ context }) => ({ attempts: context.attempts + 1 }))],
          guard: ({ context }) => context.attempts < 3,
          target: 'loading',
        },
      },
    },
  },
});
```

### Timeout with entry/exit

```ts
let timeoutId: ReturnType<typeof setTimeout> | undefined;

states: {
  idle: {
    entry: () => {
      timeoutId = setTimeout(() => m.send({ type: 'TIMEOUT' }), 5_000);
    },
    exit: () => {
      clearTimeout(timeoutId);
    },
    on: {
      ACTIVATE: { target: 'active' },
      TIMEOUT:  { target: 'expired' },
    },
  },
}
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef, useState } from 'react';
import { interpret } from '@vielzeug/machine';
import { trafficMachine } from './machine';

function TrafficLight() {
  const machineRef = useRef<ReturnType<typeof interpret<typeof trafficMachine>> | null>(null);
  const [state, setState] = useState('red');

  useEffect(() => {
    const m = interpret(trafficMachine, {
      onTransition: ({ to }) => setState(to),
    });
    machineRef.current = m;

    return () => {
      m[Symbol.dispose]();
    };
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
import { interpret } from '@vielzeug/machine';
import { trafficMachine } from './machine';

const state = ref('red');
let m: ReturnType<typeof interpret<typeof trafficMachine>>;

onMounted(() => {
  m = interpret(trafficMachine, {
    onTransition: ({ to }) => { state.value = to; },
  });
});

onUnmounted(() => {
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

```svelte [Svelte]
<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import { interpret } from '@vielzeug/machine';
import { trafficMachine } from './machine';

let state = 'red';
let m: ReturnType<typeof interpret<typeof trafficMachine>>;

onMount(() => {
  m = interpret(trafficMachine, {
    onTransition: ({ to }) => { state = to; },
  });
});

onDestroy(() => {
  m?.[Symbol.dispose]();
});
</script>

<p>Current: {state}</p>
<button on:click={() => m?.send({ type: 'NEXT' })}>Next</button>
```

:::

## Working with Other Vielzeug Libraries

### With `@vielzeug/ripple`

`state` and `context` are `ReadonlySignal` values from `@vielzeug/ripple`. Use `effect()` to drive reactive UI from machine state:

```ts
import { effect } from '@vielzeug/ripple';
import { defineMachine, interpret } from '@vielzeug/machine';

const playerMachine = defineMachine({
  context: { volume: 1 },
  initial: 'paused',
  states: {
    paused:  { on: { PLAY:  { target: 'playing' } } },
    playing: { on: { PAUSE: { target: 'paused'  } } },
  },
});

const m = interpret(playerMachine);

// Drive DOM updates reactively — runs synchronously on each transition
effect(() => {
  document.getElementById('play-btn')!.textContent =
    m.state.value === 'playing' ? 'Pause' : 'Play';
});

m.send({ type: 'PLAY' }); // effect runs immediately
```

### With `@vielzeug/relay`

Use `@vielzeug/relay` to bridge machine transitions to a shared event bus — useful for cross-machine coordination:

```ts
import { createBus } from '@vielzeug/relay';
import { defineMachine, interpret } from '@vielzeug/machine';

const bus = createBus<{ 'auth:logout': void; 'auth:login': { userId: string } }>();

const authMachine = defineMachine({
  context: { userId: '' as string },
  initial: 'anonymous',
  states: {
    anonymous: { on: { LOGIN: { target: 'authenticated', actions: [
      assign(({ context, event }) => { context.userId = (event as any).userId; }),
    ] } } },
    authenticated: { on: { LOGOUT: { target: 'anonymous' } } },
  },
});

const m = interpret(authMachine, {
  onTransition: ({ to, event }) => {
    if (to === 'anonymous') bus.emit('auth:logout', undefined);
    if (to === 'authenticated') bus.emit('auth:login', { userId: (event as any).userId });
  },
});
```

## Best Practices

- **Use discriminated event unions.** TypeScript infers payload types per transition from the event type string.
- **Keep guards pure.** Guards must not produce side effects. All mutation belongs in `actions`.
- **Use `assign()` for context updates.** Do not mutate `args.context` directly outside `assign()` or custom action functions.
- **Prefer shorthand transition syntax** (`on: { GO: { target: 'active' } }`) for single transitions. Use arrays only when you need multiple guarded alternatives.
- **Dispose machines when done.** Always call `m[Symbol.dispose]()` to prevent memory leaks and abort dangling invokes.
- **Test with `resolveTransition()`.** Unit-test guard logic in isolation without spinning up a full machine instance.
- **Validate snapshots on restore.** Pass `validateSnapshot` to guard against stale or malformed persisted state.
- **Keep machines focused.** A machine with more than 10–15 states is usually a sign it should be split.
