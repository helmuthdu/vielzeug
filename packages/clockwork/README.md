# @vielzeug/clockwork

> Zero-dependency typed finite state machine for TypeScript

[![npm version](https://img.shields.io/npm/v/@vielzeug/clockwork.svg)](https://npmjs.com/package/@vielzeug/clockwork)
[![npm downloads](https://img.shields.io/npm/dm/@vielzeug/clockwork.svg)](https://npmjs.com/package/@vielzeug/clockwork)
[![TypeScript support](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](#)

A production-ready finite state machine with typed events, reactive state, async invokes, delayed transitions, hierarchical states, interceptors, persistence, and debugging—built on `@vielzeug/ripple` with zero external dependencies.

## Why Clockwork?

- **Type-safe** — Discriminated event unions with full TypeScript inference
- **Reactive** — State and context are `@vielzeug/ripple` signals
- **Async-first** — Native Promise support with onDone/onError handlers and automatic AbortSignal cancellation
- **Delayed transitions** — Timer-based `after` transitions with guards and actions
- **Hierarchical** — Compound states with automatic leaf resolution
- **Interceptors** — Pure event interceptors, run left-to-right; return `null` to block
- **Persistent** — Save/load snapshots via pluggable adapters
- **Debuggable** — Discriminated union debug events, `onTransition` callback, and ring-buffer transition tracing
- **Validated** — Comprehensive definition validation and context checking
- **Zero overhead** — Debug features have zero cost when unused
- **Zero deps** — Depends only on `@vielzeug/ripple` (peer)

## Quick Start

```ts
import { machine } from '@vielzeug/clockwork';

type Event = { type: 'INC' } | { type: 'RESET' };

const m = machine({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        INC: {
          actions: [({ context }) => { context.count += 1; }],
          target: 'idle',
        },
        RESET: {
          actions: [({ context }) => { context.count = 0; }],
          target: 'idle',
        },
      },
    },
  },
});

console.log(m.state.value);         // 'idle'
console.log(m.context.value.count); // 0

console.log(m.send({ type: 'INC' })); // 'transitioned'
console.log(m.send({ type: 'INC' })); // 'transitioned'

console.log(m.context.value.count); // 2

m[Symbol.dispose](); // cleanup
```

## Core Concepts

### `machine()` vs `define()`

`machine(config, options?)` validates and starts an instance in one call — use it for one-off machines. `define(config)` validates once and returns a handle with `.start(options?)` for spawning multiple independent instances:

```ts
import { define } from '@vielzeug/clockwork';

const trafficDef = define({ /* config */ });

const m1 = trafficDef.start();
const m2 = trafficDef.start();

m1.send({ type: 'NEXT' });
console.log(m2.state.value); // Unaffected by m1
```

### send() and SendResult

`send()` returns a `SendResult` string — not a boolean:

| Value | Meaning |
| --- | --- |
| `'transitioned'` | Transition occurred |
| `'queued'` | Called re-entrantly from inside an action |
| `'rejected'` | No match, guard failed, interceptor blocked, or disposed |

### Transition Syntax

Single transitions use shorthand; multiple guarded alternatives use arrays:

```ts
states: {
  idle: {
    on: {
      GO: { target: 'active' },
      LOAD: [
        { guard: ({ context }) => context.authorized, target: 'dashboard' },
        { target: 'unauthorized' },
      ],
    },
  },
}
```

### Async Invokes

Run promises when entering states with automatic cancellation on exit. `onDone` and `onError` receive `(result, context)` — context is captured at invoke start:

```ts
states: {
  loading: {
    invoke: [{
      id: 'fetch-data', // optional — surfaced in debug events
      src: async ({ signal }) => fetch('/api/data', { signal }).then(r => r.json()),
      onDone:  (result, _ctx) => ({ type: 'DATA_READY', data: result }),
      onError: (error,  _ctx) => ({ type: 'DATA_ERROR', error: String(error) }),
    }],
    on: {
      DATA_READY: { target: 'idle' },
      DATA_ERROR: { target: 'error' },
    },
  },
}
```

### Delayed Transitions

Timer-based transitions with optional guards:

```ts
states: {
  notification: {
    after: [{ delay: 5000, target: 'dismissed' }],
  },
}
```

### Interceptors

Pure functions that run before event processing. Return the event to allow it, `null` to block:

```ts
import { machine, type InterceptorFn } from '@vielzeug/clockwork';

const authGuard: InterceptorFn<State, Ctx, Event> = (event, snap) => {
  if (event.type === 'ADMIN_ACTION' && !snap.context.isAdmin) return null; // block
  return event;
};

const m = machine(config, { interceptors: [authGuard] });
```

### Persistence

Save and restore machine state via pluggable adapters:

```ts
const m = machine(config, {
  persistence: {
    load: () => JSON.parse(localStorage.getItem('state') ?? 'null') ?? undefined,
    save: (snapshot) => localStorage.setItem('state', JSON.stringify(snapshot)),
  },
});
```

## Key Exports

| Export                | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `machine()`           | Validate config and start a machine instance          |
| `define()`            | Validate once; call `.start()` for multiple instances |
| `resolveTransition()` | Pure function for unit-testing transitions            |
| `MachineError`        | Typed error for validation and runtime failures       |
| `defineMachine()`     | _(Deprecated)_ Use `machine()` or `define()`          |
| `interpret()`         | _(Deprecated)_ Use `machine()` or `define().start()`  |

## Features

| Feature             | Details                                                 |
| ------------------- | ------------------------------------------------------- |
| Typed events        | Discriminated unions with TypeScript inference          |
| Reactive state      | Signals from `@vielzeug/ripple`                         |
| Async tasks         | Native Promises with onDone/onError and AbortSignal     |
| Delayed transitions | Timer-based `after` with guards and actions             |
| Hierarchical states | Compound states with automatic leaf resolution          |
| Interceptors        | Pure event interceptors — return event or null to block |
| Persistence         | Pluggable adapter for snapshot save/load                |
| Context validation  | Type guards at init and every transition                |
| Entry/exit hooks    | Lifecycle functions per state                           |
| Guards              | Conditional transitions based on context and event      |
| Tracing             | Ring buffer of last N transitions                       |
| Debug events        | Discriminated union debug callback                      |
| Event queue         | FIFO processing with configurable loop guard            |
| Context isolation   | Cloned draft before commit; rolled back on failure      |
| Pure resolver       | `resolveTransition()` — test logic without side effects |
| Subscribe           | Change-detection subscription without ripple dependency |

## Installation

```sh
pnpm add @vielzeug/clockwork @vielzeug/ripple
```

`@vielzeug/ripple` is a peer dependency and must be installed alongside.

## Documentation

- **[Full Guide](https://vielzeug.dev/clockwork/)** — Overview, concepts, quick start
- **[Usage Guide](https://vielzeug.dev/clockwork/usage/)** — Common patterns and best practices
- **[API Reference](https://vielzeug.dev/clockwork/api/)** — All types and function signatures
- **[Examples](https://vielzeug.dev/clockwork/examples/)** — Real-world integration examples

## TypeScript

Requires TypeScript 5.0+ with `strict: true`.

## License

MIT
