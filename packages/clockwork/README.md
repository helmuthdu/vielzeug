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
- **Debuggable** — Unified discriminated union `onDebug` callback and ring-buffer transition tracing
- **Validated** — Comprehensive definition validation and context checking
- **Zero overhead** — Debug features have zero cost when unused
- **Zero deps** — Depends only on `@vielzeug/ripple`

## Quick Start

```ts
import { createMachine } from '@vielzeug/clockwork';

type Event = { type: 'INC' } | { type: 'RESET' };

const m = createMachine({
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
}).start();

console.log(m.state.value);         // 'idle'
console.log(m.context.value.count); // 0

console.log(m.send({ type: 'INC' }).status); // 'transitioned'
console.log(m.send({ type: 'INC' }).status); // 'transitioned'

console.log(m.context.value.count); // 2

m[Symbol.dispose](); // cleanup
```

## Core Concepts

### `createMachine()` — definition handle

`createMachine(config)` validates and returns a `MachineDefinition` handle. Call `.start(options?)` to create running instances. Calling `.start()` multiple times spawns independent instances:

```ts
import { createMachine } from '@vielzeug/clockwork';

const trafficDef = createMachine({ /* config */ });

const m1 = trafficDef.start();
const m2 = trafficDef.start();

m1.send({ type: 'NEXT' });
console.log(m2.state.value); // Unaffected by m1
```

### send() and SendResult

`send()` returns a `SendResult` object. Check `.status`:

| `status` value | Meaning |
| --- | --- |
| `'transitioned'` | Transition occurred |
| `'queued'` | Called re-entrantly from inside an action |
| `'rejected'` | No match, guard failed, interceptor blocked, or machine is disposed |

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
import { createMachine, type InterceptorFn } from '@vielzeug/clockwork';

const authGuard: InterceptorFn<State, Ctx, Event> = (event, snap) => {
  if (event.type === 'ADMIN_ACTION' && !snap.context.isAdmin) return null; // block
  return event;
};

const m = createMachine(config).start({ interceptors: [authGuard] });
```

### Persistence

Save and restore machine state via pluggable adapters:

```ts
const m = createMachine(config).start({
  persistence: {
    load: () => JSON.parse(localStorage.getItem('state') ?? 'null') ?? undefined,
    save: (snapshot) => localStorage.setItem('state', JSON.stringify(snapshot)),
  },
});
```

## Key Exports

| Export              | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `createMachine()`   | Validate config; returns a `MachineDefinition` handle    |
| `.start(options?)`  | Start a running instance from the definition handle      |
| `.resolve(input)`   | Pure transition resolver for unit-testing transitions    |
| `ClockworkError`    | Base class for all validation and runtime failures       |

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
| Pure resolver       | `.resolve()` on `MachineDefinition` — test without side effects |
| Subscribe           | Change-detection subscription without ripple dependency |

## Installation

```sh
pnpm add @vielzeug/clockwork
```

`@vielzeug/ripple` is installed automatically as a direct dependency.

## Documentation

- **[Full Guide](https://vielzeug.dev/clockwork/)** — Overview, concepts, quick start
- **[Usage Guide](https://vielzeug.dev/clockwork/usage/)** — Common patterns and best practices
- **[API Reference](https://vielzeug.dev/clockwork/api/)** — All types and function signatures
- **[Examples](https://vielzeug.dev/clockwork/examples/)** — Real-world integration examples

## TypeScript

Requires TypeScript 5.0+ with `strict: true`.

## License

MIT
