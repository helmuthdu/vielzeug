---
title: Clockwork — Usage Guide
description: Common patterns, best practices, and recipes for building state machines with Clockwork.
---

[[toc]]

## Basic Usage

### Minimal Example

```ts
import { createMachine } from '@vielzeug/clockwork';

type Event = { type: 'TOGGLE' };

const m = createMachine({
  initial: 'on',
  states: {
    off: { on: { TOGGLE: { target: 'on' } } },
    on: { on: { TOGGLE: { target: 'off' } } },
  },
}).start();

console.log(m.send({ type: 'TOGGLE' }).status); // 'transitioned' — state changes to 'off'
```

### With Context

Context holds data that changes during transitions. Mutate it directly inside action functions:

```ts
import { createMachine } from '@vielzeug/clockwork';

type Event = { type: 'DEC' } | { type: 'INC' };

const m = createMachine({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DEC: {
          actions: [
            ({ context }) => {
              context.count -= 1;
            },
          ],
          target: 'idle',
        },
        INC: {
          actions: [
            ({ context }) => {
              context.count += 1;
            },
          ],
          target: 'idle',
        },
      },
    },
  },
}).start();
```

::: tip Context is required when non-empty
When your context type has properties (e.g. `{ count: number }`), `context` is a required field. For stateless machines, omit `context` entirely.
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

`onDone` and `onError` receive `(result, context)` — context is a snapshot from when the invoke started, not the live value at resolution time.

```ts
states: {
  loading: {
    invoke: [
      {
        id: 'fetch-items', // optional; shown in debug events as invokeId
        src: async ({ signal }) => fetch('/api/data', { signal }).then(r => r.json()),
        onDone:  (result, _ctx) => ({ type: 'DATA_READY', data: result }),
        onError: (error,  _ctx) => ({ type: 'DATA_ERROR', message: String(error) }),
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

A state can run multiple invokes in parallel. Each invoke can have an optional `id` string that appears as `invokeId` in debug events:

```ts
invoke: [
  { id: 'user', src: async () => fetchUser(), onDone: (user, _ctx) => ({ type: 'USER_LOADED', user }) },
  { id: 'perms', src: async () => fetchPermissions(), onDone: (perms, _ctx) => ({ type: 'PERMS_LOADED', perms }) },
],
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
import { createMachine } from '@vielzeug/clockwork';

const m = createMachine({
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
}).start();

// Entering 'active' automatically resolves to 'active.editing'
console.log(m.state.value); // 'active.editing'
```

### Leaf resolution

When targeting a compound state, the machine automatically descends to the deepest `initial` leaf:

```ts
// target: 'active' resolves to 'active.editing'
on: {
  RESTART: {
    target: 'active';
  }
}
```

### `matches()` with hierarchy

`matches()` returns `true` for ancestor states too:

```ts
m.matches('active'); // true when in 'active.editing' or 'active.saving'
m.matches('active.editing'); // true only when in 'active.editing'
```

## Context Validation

Validate context at initialization and on every transition:

```ts
import { createMachine } from '@vielzeug/clockwork';

const m = createMachine({
  context: { count: 0, name: 'app' },
  initial: 'idle',
  validateContext: (ctx) => {
    if (typeof ctx.count !== 'number') return 'count must be a number';
    if (typeof ctx.name !== 'string') return 'name must be a string';

    return true;
  },
  states: { idle: {} },
}).start();
```

When validation fails, a `ClockworkInvalidValidateContextError` is thrown — its `.reason` field carries the string returned by `validateContext`. The machine state and context are **unchanged** — the transition is rolled back before any signals are updated.

## Persistence

Save and restore machine state across sessions using a persistence adapter.

### Local Storage

```ts
import { createMachine, type MachineSnapshot } from '@vielzeug/clockwork';

const m = createMachine(config).start({
  persistence: {
    load: () => {
      const raw = localStorage.getItem('clockwork:state');
      return raw ? (JSON.parse(raw) as MachineSnapshot<State, Context>) : undefined;
    },
    save: (snapshot) => {
      localStorage.setItem('clockwork:state', JSON.stringify(snapshot));
    },
  },
});
```

### Hydration behavior

On startup, `createMachine().start()` checks `options.snapshot` first, then `persistence.load()`. If a persisted snapshot exists, the machine hydrates from it — entry hooks run, invokes start, and after-timers schedule.

::: warning Disposal does not clear persistence
`m[Symbol.dispose]()` does **not** clear persisted state. The machine may be recreated (e.g. after HMR or component remount) and should resume from the last saved state. To reset persistence, call your adapter's storage API directly.
:::

::: tip Validate loaded snapshots
Hydrated context is trusted by default for backward compatibility. To enforce `validateContext` during hydration, pass `validateHydratedContext: true` to `.start(...)`.

If context is loaded from untrusted sources (e.g. `localStorage`), enable `validateHydratedContext` or validate inside `persistence.load()` before returning the snapshot.
:::

## Interceptors

Interceptors are pure functions that run before event processing. Return the event (optionally transformed) to allow it, or `null` to block it. They run left-to-right — the first `null` stops the chain:

```ts
import { createMachine, type InterceptorFn } from '@vielzeug/clockwork';

const logger: InterceptorFn<State, Context, Event> = (event, snapshot) => {
  console.log(`[${snapshot.state}] ${event.type}`);
  return event; // pass through
};

const blocker: InterceptorFn<State, Context, Event> = (event, _snapshot) => {
  if (event.type === 'BLOCKED') return null; // swallow event
  return event;
};

const m = createMachine(config).start({ interceptors: [logger, blocker] });
```

::: tip
Interceptors can also transform events — return a modified event object to change its type or payload before it reaches the machine.
:::

## send() and SendResult

`send()` returns a `SendResult` object. Check `.status` for the outcome:

```ts
const result = m.send({ type: 'GO' });
// result.status === 'transitioned' — a transition occurred
// result.status === 'queued'       — called re-entrantly from inside an action
// result.status === 'rejected'     — no match, guard failed, interceptor blocked, or disposed
```

Use this for conditional feedback or analytics:

```ts
if (m.send({ type: 'SUBMIT' }).status === 'rejected') {
  showError('Action not allowed in current state');
}
```

## Checking State

### `matches()` — check multiple states at once

```ts
m.matches('idle'); // true if current state is 'idle'
m.matches('loading', 'error'); // true if in either state (or a child of either)
```

### `can()` — check if an event would be accepted

```ts
m.can({ type: 'SUBMIT' }); // true if a valid transition exists for SUBMIT in the current state
```

::: tip
`can()` evaluates guards against the current context but does **not** fire any debug hooks. It is a pure read — use it freely for UI conditional rendering.
:::

## Subscribe

Subscribe to state/context changes without using `@vielzeug/ripple` directly:

```ts
const unsub = m.subscribe(({ state, context }) => {
  renderUI(state, context);
});

m.send({ type: 'INC' }); // subscriber fires

unsub(); // stop listening
```

The callback fires only when `state` or `context` reference changes — not on every signal read.
Each callback receives an isolated snapshot object; mutating the callback payload does not mutate machine state.

## Debugging and Tracing

For quick console-based debugging, use `debugMachine` from the dedicated sub-path. It pre-wires `onDebug` to `console.debug`/`console.group` and is tree-shaken from production bundles.

::: warning Development only
`debugMachine` writes event payloads — including full event objects and context — to the console. Do not use it in production if events or context contain PII.
:::

```ts
import { debugMachine } from '@vielzeug/clockwork/devtools';

const m = debugMachine(config);
m.send({ type: 'START' });
// [clockwork:transition] START: idle → active
// [clockwork:guard] START: idle → active — passed
```

For custom handling, pass `onDebug` directly to `createMachine().start()`.

### Debug events

The `onDebug` callback receives a discriminated union of debug events:

```ts
const m = createMachine(config).start({
  onDebug: (event) => {
    switch (event.type) {
      case 'guard':
        console.log(`Guard: ${event.from} → ${event.target} = ${event.passed}`);
        break;
      case 'transition':
        console.log(`${event.event.type}: ${event.from} → ${event.to}`);
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
});
```

### Transition trace buffer

When `onDebug` is set, a 50-entry trace buffer is enabled automatically. Set `traceLimit` to control size (`0` disables):

```ts
const m = createMachine(config).start({ onDebug: () => {}, traceLimit: 200 });

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

`.resolve()` is a pure method on `MachineDefinition` — it resolves which `TransitionDef` would apply without running any actions, entry/exit handlers, or invokes:

```ts
import { createMachine } from '@vielzeug/clockwork';

const config = {
  /* machine config */
};
const def = createMachine(config);

const transition = def.resolve({
  context: { authorized: false },
  event: { type: 'LOGIN' },
  state: 'idle',
});
expect(transition).toBeUndefined(); // guard failed

const passing = def.resolve({
  context: { authorized: true },
  event: { type: 'LOGIN' },
  state: 'idle',
});
expect(passing?.target).toBe('dashboard');
```

### Snapshot testing

```ts
const m = createMachine(config).start();

const before = m.getSnapshot();
m.send({ type: 'UPDATE', value: 10 });
const after = m.getSnapshot();

expect(before.context.value).toBe(0);
expect(after.context.value).toBe(10);
```

## Disposal

Always dispose machines to clean up signals, abort in-flight invokes, and clear after-timers.

```ts
const m = createMachine(config).start();

m.dispose(); // aborts invokes, clears timers, disposes reactive signals

// With the explicit resource management proposal (ES2024+):
{
  using m = createMachine(config).start();
  m.send({ type: 'GO' });
} // dispose() called automatically via [Symbol.dispose]
```

::: warning
Disposal does **not** clear persisted state. The machine may resume from the last snapshot on recreation.
:::

## Common Patterns

### Traffic Light

```ts
import { createMachine } from '@vielzeug/clockwork';

type Event = { type: 'EMERGENCY' } | { type: 'NEXT' };

const trafficLight = createMachine({
  initial: 'red',
  states: {
    green: { on: { EMERGENCY: { target: 'red' }, NEXT: { target: 'yellow' } } },
    red: { on: { EMERGENCY: { target: 'red' }, NEXT: { target: 'green' } } },
    yellow: { on: { EMERGENCY: { target: 'red' }, NEXT: { target: 'red' } } },
  },
}).start();
```

### Auto-dismiss notification

```ts
import { createMachine } from '@vielzeug/clockwork';

type Event = { type: 'DISMISS' } | { type: 'SHOW'; message: string };

const notification = createMachine({
  context: { message: '' },
  initial: 'hidden',
  states: {
    hidden: {
      on: {
        SHOW: {
          actions: [
            ({ context, event }) => {
              context.message = event.message;
            },
          ],
          target: 'visible',
        },
      },
    },
    visible: {
      after: [{ delay: 5000, target: 'hidden' }],
      on: { DISMISS: { target: 'hidden' } },
    },
  },
}).start();
```

### Auth flow with async login

```ts
import { createMachine } from '@vielzeug/clockwork';

type Context = { attempts: number; user?: { id: string; token: string } };
type Event =
  | { email: string; password: string; type: 'SUBMIT' }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_SUCCESS'; user: { id: string; token: string } }
  | { type: 'AUTH_FAILED' };

const auth = createMachine({
  context: { attempts: 0 },
  initial: 'unauthenticated',
  states: {
    authenticated: {
      on: {
        LOGOUT: {
          actions: [
            ({ context }) => {
              context.user = undefined;
            },
          ],
          target: 'unauthenticated',
        },
      },
    },
    error: {},
    loading: {
      invoke: [
        {
          src: async ({ entryEvent, signal }) => {
            if (entryEvent.type !== 'SUBMIT') throw new Error('unexpected');
            return fetch('/auth/login', {
              body: JSON.stringify({ email: entryEvent.email, password: entryEvent.password }),
              method: 'POST',
              signal,
            }).then((r) => r.json());
          },
          onDone: (user, _ctx) => ({ type: 'AUTH_SUCCESS', user: user as { id: string; token: string } }),
          onError: (_err, _ctx) => ({ type: 'AUTH_FAILED' }),
        },
      ],
      on: {
        AUTH_FAILED: { target: 'unauthenticated' },
        AUTH_SUCCESS: {
          actions: [
            ({ context, event }) => {
              context.user = event.user;
            },
          ],
          target: 'authenticated',
        },
      },
    },
    unauthenticated: {
      on: {
        SUBMIT: {
          actions: [
            ({ context }) => {
              context.attempts += 1;
            },
          ],
          guard: ({ context }) => context.attempts < 3,
          target: 'loading',
        },
      },
    },
  },
}).start();
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useRef, useState } from 'react';
import { createMachine, type MachineInstance } from '@vielzeug/clockwork';
import { trafficConfig } from './machine';

function TrafficLight() {
  const machineRef = useRef<MachineInstance<any, any, any> | null>(null);
  const [state, setState] = useState('red');

  useEffect(() => {
    const m = createMachine(trafficConfig).start();
    machineRef.current = m;
    const unsub = m.subscribe(({ state }) => setState(state));
    return () => {
      unsub();
      m.dispose();
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
import { createMachine, type MachineInstance } from '@vielzeug/clockwork';
import { trafficConfig } from './machine';

const state = ref('red');
let m: MachineInstance<string, Record<string, never>, { type: string }>;
let unsub: (() => void) | undefined;

onMounted(() => {
  m = createMachine(trafficConfig).start();
  unsub = m.subscribe(({ state: s }) => { state.value = s; });
});

onUnmounted(() => { unsub?.(); m?.dispose(); });
</script>

<template>
  <div>
    <p>Current: {{ state }}</p>
    <button @click="m?.send({ type: 'NEXT' })">Next</button>
  </div>
</template>
```

:::

## Server-Side Rendering

Clockwork's `state` and `context` are `@vielzeug/ripple` signals, so every machine shares ripple's module-level flush queue by default. That's fine for a single long-running Node process with one machine tree, but if you create machines **per incoming request** (e.g. an SSR handler that runs `createMachine(config).start()` on every request), concurrent requests can share scheduling state and interleave `batch()` flushes.

Install `@vielzeug/ripple`'s SSR tracking provider once at server bootstrap to give each request its own isolated scheduling context — clockwork needs no special import or configuration, it automatically picks up whatever provider ripple has installed:

```ts
// server bootstrap (once, at startup)
import { createAsyncProvider, setTrackingProvider } from '@vielzeug/ripple/ssr';

const provider = createAsyncProvider();
setTrackingProvider(provider);
```

```ts
// inside each request handler
import { runWithProvider } from '@vielzeug/ripple/ssr';
import { createMachine } from '@vielzeug/clockwork';
import { trafficConfig } from './machine';

async function handleRequest(req: Request): Promise<Response> {
  return runWithProvider(provider, async () => {
    const m = createMachine(trafficConfig).start();

    // ...drive the machine and render...

    m.dispose();
    return new Response(/* ... */);
  });
}
```

Single-page apps, static builds, and Node scripts that never run concurrent request handlers don't need this — the default (no provider installed) is correct there. See the `@vielzeug/ripple/ssr` entry in `@vielzeug/ripple`'s [API reference](/ripple/api#package-entry-point) for the full provider API.

## Working with Other Vielzeug Libraries

### With `@vielzeug/ripple`

`state` and `context` are `Reactive` values from `@vielzeug/ripple`. Use `effect()` to drive reactive UI from Clockwork state:

```ts
import { effect } from '@vielzeug/ripple';
import { createMachine } from '@vielzeug/clockwork';

const m = createMachine(playerConfig).start();

effect(() => {
  document.getElementById('play-btn')!.textContent = m.state.value === 'playing' ? 'Pause' : 'Play';
});

m.send({ type: 'PLAY' }); // effect runs immediately
```

### With `@vielzeug/herald`

Bridge Clockwork transitions to a shared event bus for cross-machine coordination:

```ts
import { createBus } from '@vielzeug/herald';
import { createMachine } from '@vielzeug/clockwork';

const bus = createBus<{ 'auth:login': { userId: string }; 'auth:logout': void }>();

const m = createMachine(authConfig).start({
  onDebug: ({ type, ...ev }) => {
    if (type === 'transition' && ev.to === 'anonymous') bus.emit('auth:logout', undefined);
  },
});
```

## Best Practices

- **Use discriminated event unions.** TypeScript infers payload types per transition from the event type string.
- **Keep guards pure.** Guards must not produce side effects. All mutation belongs in `actions`.
- **Mutate context directly in actions.** Actions receive a cloned draft — mutate it in place.
- **Prefer shorthand transition syntax** (`on: { GO: { target: 'active' } }`) for single transitions. Use arrays only when you need multiple guarded alternatives.
- **Dispose machines when done.** Always call `m.dispose()` (or `using m = createMachine(...).start()`) to prevent memory leaks and abort dangling invokes.
- **Test with `.resolve()`.** Unit-test guard logic in isolation without spinning up a full machine instance.
- **Keep machines focused.** A machine with more than 10–15 states is usually a sign it should be split.
- **Use after for timeouts.** Prefer `after` over manual setTimeout in entry hooks — timers are automatically cleaned up on state exit.
