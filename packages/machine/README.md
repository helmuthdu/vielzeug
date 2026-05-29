# @vielzeug/machine

> Zero-dependency typed finite state machine for TypeScript

[![npm version](https://img.shields.io/npm/v/@vielzeug/machine.svg)](https://npmjs.com/package/@vielzeug/machine)
[![npm downloads](https://img.shields.io/npm/dm/@vielzeug/machine.svg)](https://npmjs.com/package/@vielzeug/machine)
[![TypeScript support](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](#)

A production-ready finite state machine with typed events, reactive state, async invokes, persistence, and debugging—built on `@vielzeug/ripple` with zero external dependencies.

## Why Machine?

- **Type-safe** — Discriminated event unions with full TypeScript inference
- **Reactive** — State and context are `@vielzeug/ripple` signals
- **Async-first** — Native Promise support with onDone/onError handlers and automatic AbortSignal cancellation
- **Persistent** — Save/load/clear snapshots via pluggable adapters
- **Debuggable** — Optional lifecycle hooks, `onTransition` callback, and ring-buffer transition tracing
- **Validated** — Comprehensive definition validation and context checking at startup
- **Zero overhead** — Debug features have zero cost when unused
- **Zero deps** — Depends only on `@vielzeug/ripple` (peer)

## Quick Start

```ts
import { assign, defineMachine, interpret } from '@vielzeug/machine';

type Event = { type: 'INC' } | { type: 'RESET' };

const machine = defineMachine<'idle', { count: number }, Event>({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        INC:   { actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' },
        RESET: { actions: [assign(() => ({ count: 0 }))], target: 'idle' },
      },
    },
  },
});

const m = interpret(machine);

console.log(m.state.value);         // 'idle'
console.log(m.context.value.count); // 0

m.send({ type: 'INC' });
m.send({ type: 'INC' });

console.log(m.context.value.count); // 2

m[Symbol.dispose](); // cleanup
```

## Core Concepts

### Definition and Interpretation

Definitions are immutable, validated configurations. Instances are live machines.

```ts
// Define once — validated and frozen at this call
const definition = defineMachine({ /* ... */ });

// Interpret many — each instance is independent
const m1 = interpret(definition);
const m2 = interpret(definition);

m1.send({ type: 'GO' });
console.log(m2.state.value); // Unaffected by m1
```

### Transition Syntax

Single transitions use shorthand; multiple guarded alternatives use arrays:

```ts
states: {
  idle: {
    on: {
      // Shorthand — one possible transition
      GO: { target: 'active' },

      // Array — first passing guard wins
      LOAD: [
        { guard: ({ context }) => context.authorized, target: 'dashboard' },
        { target: 'unauthorized' },
      ],
    },
  },
}
```

### Typed Events

Use discriminated unions for exhaustive event handling:

```ts
type Event =
  | { email: string; password: string; type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { token: string; type: 'REFRESH_TOKEN' };

// Payloads are type-checked — missing 'email' is a compile error
m.send({ type: 'LOGIN', email: 'user@example.com', password: 'secret' });
```

### Entry and Exit Actions

`entry` fires when a state is entered; `exit` fires when it is left. Entry receives only `{ context }` — use transition `actions` if you need the event payload:

```ts
states: {
  active: {
    entry: ({ context }) => { context.startTime = Date.now(); },
    exit:  ({ context }) => { context.duration = Date.now() - context.startTime; },
    on: { STOP: { target: 'idle' } },
  },
}
```

### Async Invokes

Run promises when entering states. Automatically dispatches events on completion or error, and aborts on state exit:

```ts
states: {
  loading: {
    invoke: [
      {
        src: async ({ signal }) => fetch('/api/data', { signal }).then(r => r.json()),
        onDone:  (result) => ({ type: 'DATA_READY', data: result }),
        onError: (error)  => ({ type: 'DATA_ERROR', error: String(error) }),
      },
    ],
    on: {
      DATA_ERROR: { target: 'error' },
      DATA_READY: { actions: [assign(({ event }) => ({ data: event.data }))], target: 'idle' },
    },
  },
}
```

### Persistence

Save and restore machine state using a persistence adapter:

```ts
const m = interpret(machine, {
  persistence: {
    clear: () => localStorage.removeItem('machine'),
    load:  () => JSON.parse(localStorage.getItem('machine') ?? 'null'),
    save:  (snapshot) => localStorage.setItem('machine', JSON.stringify(snapshot)),
  },
});

// Explicitly clear persisted state (disposal does NOT clear it)
m.clearPersistence();
```

### Checking State

```ts
m.state.value;            // current state string
m.matches('idle');        // true if in 'idle'
m.matches('a', 'b');      // true if in 'a' or 'b'
m.can({ type: 'GO' });    // true if GO is a valid event right now
```

### Debugging and Tracing

Optional hooks for observability with zero overhead when omitted:

```ts
const m = interpret(machine, {
  debug: {
    onTransitionSkipped: ({ event, from }) =>
      console.log(`${event.type} rejected in ${from}`),
    onInvokeDone: ({ invokeId, result }) =>
      console.log(`invoke #${invokeId} done:`, result),
  },
  onTransition: ({ from, to, event }) =>
    analytics.track('state_change', { from, to, event: event.type }),
  traceLimit: 100,
});

console.log(m.getTrace()); // chronological transition history
```

## Key Exports

| Export | Purpose |
| --- | --- |
| `defineMachine()` | Create immutable, validated FSM definition |
| `interpret()` | Create live machine instance from definition |
| `resolveTransition()` | Pure function for unit-testing transitions |
| `assign()` | Helper to shallow-merge context updates |
| `MachineError` | Typed error for validation and runtime failures |

## Features

| Feature | Details |
| --- | --- |
| Typed events | Discriminated unions with TypeScript inference |
| Reactive state | Signals from `@vielzeug/ripple` |
| Async tasks | Native Promises with onDone/onError and AbortSignal |
| Persistence | Pluggable adapter; explicit `clearPersistence()` |
| Context validation | Type guards at init, hydration, every transition |
| Entry/exit actions | Lifecycle hooks per state |
| Guards | Conditional transitions based on context |
| Shorthand transitions | Single object or array — your choice |
| Tracing | Ring buffer of last N transitions |
| Debug hooks | Optional lifecycle callbacks |
| Event queue | FIFO processing with configurable loop guard |
| Context isolation | Cloned draft before commit; rolled back on validation failure |
| Pure resolver | `resolveTransition()` — test logic without side effects |

## Installation

```sh
pnpm add @vielzeug/machine @vielzeug/ripple
```

`@vielzeug/ripple` is a peer dependency and must be installed alongside.

## Documentation

- **[Full Guide](https://vielzeug.dev/machine/)** — Overview, concepts, quick start
- **[Usage Guide](https://vielzeug.dev/machine/usage/)** — Common patterns and best practices
- **[API Reference](https://vielzeug.dev/machine/api/)** — All types and function signatures
- **[Examples](https://vielzeug.dev/machine/examples/)** — Real-world integration examples

## TypeScript

Requires TypeScript 5.0+ with `strict: true`.

## License

MIT
