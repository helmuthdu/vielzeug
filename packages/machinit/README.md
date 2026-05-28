# @vielzeug/machinit

> Zero-dependency typed finite state machine for TypeScript

[![npm version](https://img.shields.io/npm/v/@vielzeug/machinit.svg)](https://npmjs.com/package/@vielzeug/machinit)
[![npm downloads](https://img.shields.io/npm/dm/@vielzeug/machinit.svg)](https://npmjs.com/package/@vielzeug/machinit)
[![TypeScript support](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](#)

A production-ready finite state machine with typed events, reactive state, async invokes, persistence, and debugging—built on `@vielzeug/stateit` with zero external dependencies.

## Why Machinit?

- **Type-safe** — Discriminated event unions with full TypeScript inference
- **Reactive** — State and context are `@vielzeug/stateit` signals
- **Async-first** — Native Promise support with onDone/onError handlers
- **Persistent** — Save/load snapshots via pluggable adapters
- **Debuggable** — Optional lifecycle hooks and transition tracing
- **Validated** — Comprehensive definition validation and context checking
- **Zero overhead** — Debug features have zero cost when unused
- **Zero deps** — Depends only on `@vielzeug/stateit` (peer)

## Quick Start

```ts
import { defineMachine, interpret, assign } from '@vielzeug/machinit';

type Event = { type: 'INC' } | { type: 'RESET' };

const machine = defineMachine<'idle', { count: number }, Event>({
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INC: [{ actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' }],
        RESET: [{ actions: [assign(() => ({ count: 0 }))], target: 'idle' }],
      },
    },
  },
});

const m = interpret(machine);

console.log(m.state.value); // 'idle'
console.log(m.context.value.count); // 0

m.send({ type: 'INC' });
m.send({ type: 'INC' });

console.log(m.context.value.count); // 2

m[Symbol.dispose](); // Cleanup
```

## Core Concepts

### Definition and Interpretation

Definitions are immutable, validated configurations. Instances are live machines.

```ts
// Definition—validate and freeze once
const definition = defineMachine({ /* ... */ });

// Instances—spawn as many independent machines as needed
const m1 = interpret(definition);
const m2 = interpret(definition);

m1.send({ type: 'GO' });
console.log(m2.state.value); // Unaffected by m1
```

### Typed Events

Use discriminated unions for exhaustive event handling:

```ts
type Event =
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN'; token: string };

// Event payloads are type-checked—missing 'email' is a compile error
m.send({ type: 'LOGIN', email: 'user@example.com', password: 'secret' });
```

### Async Invokes

Run promises when entering states. Automatically dispatch events on completion or error.

```ts
states: {
  loading: {
    invoke: [
      {
        src: async ({ signal }) => fetch('/api/data', { signal }).then(r => r.json()),
        onDone: (result) => ({ type: 'DATA_READY', data: result }),
        onError: (error) => ({ type: 'DATA_ERROR', error: String(error) }),
      },
    ],
    on: {
      DATA_READY: [{ target: 'idle' }],
      DATA_ERROR: [{ target: 'error' }],
    },
  },
}
```

### Persistence

Save and restore machine state using an adapter:

```ts
const m = interpret(machine, {
  persistence: {
    load: () => JSON.parse(localStorage.getItem('machine') || 'null'),
    save: (snapshot) => localStorage.setItem('machine', JSON.stringify(snapshot)),
    clear: () => localStorage.removeItem('machine'),
  },
});
```

### Debugging and Tracing

Optional hooks for observability (zero overhead when not used):

```ts
const m = interpret(machine, {
  debug: {
    onTransitionSkipped: (info) => console.log(`Event ${info.event.type} rejected in ${info.from}`),
    onInvokeDone: (info) => console.log(`Task completed:`, info.result),
  },
  traceLimit: 100, // Keep last 100 transitions
});

console.log(m.getTrace()); // Full history
```

## Features

| Feature | Details |
|---------|---------|
| **Typed events** | Discriminated unions with TypeScript inference |
| **Reactive state** | Signals from `@vielzeug/stateit` |
| **Async tasks** | Native Promises with onDone/onError |
| **Persistence** | Pluggable adapter pattern |
| **Context validation** | Type guards at init, hydration, transitions |
| **Entry/exit actions** | Lifecycle hooks per state |
| **Guards** | Conditional transitions based on context |
| **Tracing** | Circular buffer of transitions |
| **Debug hooks** | Optional lifecycle callbacks |
| **Event queue** | FIFO processing with loop guards |
| **Deep cloning** | Snapshots prevent mutation corruption |
| **Pure resolver** | Test transition logic without side effects |

## Key Exports

| Export | Purpose |
|--------|---------|
| `defineMachine()` | Create immutable, validated FSM definition |
| `interpret()` | Create live machine instance from definition |
| `resolveTransition()` | Pure function for testing transitions |
| `assign()` | Helper to merge context updates |
| `MachinitError` | Typed error for validation failures |

## Documentation

- **[Full Guide](https://vielzeug.dev/machinit/)** — Complete reference and patterns
- **[API Reference](https://vielzeug.dev/machinit/api/)** — Types and functions
- **[Usage Guide](https://vielzeug.dev/machinit/usage/)** — Common patterns and recipes
- **[Examples](https://vielzeug.dev/machinit/examples/)** — Real-world use cases

## Installation

```sh
npm install @vielzeug/machinit @vielzeug/stateit
```

**Note:** `@vielzeug/stateit` is a peer dependency and must be installed separately.

## TypeScript

Machinit requires TypeScript 5.0+. Install globally or locally:

```sh
npm install --save-dev typescript
```

## Testing

All 21 tests passing:

```sh
npm run test
```

## License

MIT
