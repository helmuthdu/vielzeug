---
title: Machine — Typed finite state machine for TypeScript
description: Zero-dependency typed FSM with async invokes, reactive state, persistence, tracing, and full TypeScript support.
package: machine
category: state
keywords: [state-machine, finite-state, reactive, typed, async-tasks, persistence, debugging]
related: [ripple, relay, permit]
exports: [defineMachine, interpret, resolveTransition, assign, MachinitError]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="machine" />

<img src="/logo-machine.svg" alt="Machine logo" width="156" class="logo-highlight"/>

# Machine

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/machine` · **Category:** State

**Key exports:** `defineMachine`, `interpret`, `resolveTransition`, `assign`, `MachinitError`

**When to use:** Complex application state with discrete states, guarded transitions, async side effects, and persistence.

**Related:** [Ripple](/ripple/) · [Relay](/relay/) · [Permit](/permit/)

</details>

`@vielzeug/machine` is a zero-dependency typed finite state machine. Define states, events, transitions, and async invokes once, then get a reactive, fully-typed machine instance with persistence, tracing, and debugging hooks—all with zero runtime overhead.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/machine
```

```sh [npm]
npm install @vielzeug/machine
```

```sh [yarn]
yarn add @vielzeug/machine
```

:::

## Quick Start

```ts
import { defineMachine, interpret, assign } from '@vielzeug/machine';

type Event = { type: 'START' } | { type: 'COMPLETE'; result: string };

type Counter = { count: number };

const machine = defineMachine<'idle' | 'active', Counter, Event>({
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        START: [{ target: 'active' }],
      },
    },
    active: {
      on: {
        COMPLETE: [
          {
            target: 'idle',
            actions: [assign(({ event }) => ({ count: event.result.length }))],
          },
        ],
      },
    },
  },
});

const m = interpret(machine);

console.log(m.state.value); // 'idle'
console.log(m.context.value.count); // 0

m.send({ type: 'START' });
m.send({ type: 'COMPLETE', result: 'hello' });

console.log(m.state.value); // 'idle'
console.log(m.context.value.count); // 5
```

## Why Machine?

Manual state management leads to invalid state combinations, unreachable code paths, and complex conditional logic. FSMs eliminate these bugs by making state transitions explicit and exhaustive.

```ts
// Before — manual state management
type LoaderState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: string;
  error?: Error;
  isRetrying?: boolean;
};
// Multiple invalid state combinations are possible.

// After — FSM enforces valid state combinations
type Event = { type: 'FETCH' } | { type: 'DONE'; data: string } | { type: 'FAIL'; error: Error };

const loader = defineMachine<'idle' | 'loading' | 'success' | 'error', Context, Event>({
  initial: 'idle',
  context: { data: '', error: undefined },
  states: {
    idle: { on: { FETCH: [{ target: 'loading' }] } },
    loading: { on: { DONE: [{ target: 'success' }], FAIL: [{ target: 'error' }] } },
    success: { on: { FETCH: [{ target: 'loading' }] } },
    error: { on: { FETCH: [{ target: 'loading' }] } },
  },
});
// Now success && error is impossible. State is always valid.
```

| Feature                   | Machine                               | xstate              | zustand             |
| ------------------------- | -------------------------------------- | ------------------- | ------------------- |
| Bundle size               | <PackageInfo package="machine" type="size" /> | ~15 KB              | ~2 KB               |
| Zero dependencies         | ✅                                     | ❌ 5+ deps          | ✅                  |
| Typed discriminated events | ✅                                     | ⚠️ Partial          | ❌                  |
| Reactive signals          | ✅ Native                              | ❌ Observer pattern | ✅ Native           |
| Persistence adapter       | ✅ Pluggable                           | ✅                  | ✅                  |
| Deep context cloning      | ✅                                     | ✅                  | ❌                  |

**Use Machine when** you need predictable state machines with strict type safety, reactive integrations, and a minimal footprint in applications where state is defined upfront.

**Consider xstate when** you need visual state machine tooling or already have a large bundle budget.

## Features

- `defineMachine()` — Create immutable, validated FSM definitions
- `interpret()` — Spawn reactive machine instances from definitions
- **Typed events** — Discriminated unions with TypeScript inference
- **Reactive state** — State and context are `@vielzeug/ripple` signals
- **Async invokes** — Native Promise support with onDone/onError handlers
- **Persistence** — Snapshot save/load/clear adapter pattern
- **Tracing** — Circular buffer of transitions for debugging
- **Debug hooks** — Optional lifecycle callbacks with zero overhead
- **Event queue** — FIFO processing with infinite-loop guards
- **Deep cloning** — Snapshots prevent external context mutations
- **Pure resolver** — Test transition logic independently

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Ripple](/ripple/) — Reactive signals and effects; core reactivity layer for Machine
- [Relay](/relay/) — Typed event bus; complementary for event-driven architectures
- [Permit](/permit/) — RBAC engine; use alongside Machine for state-dependent permissions
- [Forge](/forge/) — Form state management; integrates with Machine for multi-step workflows

<!-- markdownlint-enable MD025 MD033 MD060 -->
