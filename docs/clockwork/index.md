---
title: Clockwork — Typed finite state machine for TypeScript
description: Zero-dependency typed FSM with async invokes, delayed transitions, hierarchical states, middleware, reactive state, persistence, tracing, and full TypeScript support.
package: clockwork
category: state
keywords: [state-machine, finite-state, reactive, typed, async-tasks, persistence, debugging, hierarchical, middleware]
related: [ripple, herald, ward]
exports: [defineMachine, interpret, resolveTransition, MachineError]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="clockwork" />

<img src="/logo-clockwork.svg" alt="Clockwork logo" width="156" class="logo-highlight"/>

# Machine

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/clockwork` &nbsp;·&nbsp; **Category:** State

**Key exports:** `defineMachine`, `interpret`, `resolveTransition`, `MachineError`

**When to use:** Complex application state with discrete states, guarded transitions, async side effects, delayed transitions, and persistence.

**Related:** [Ripple](/ripple/) &nbsp;·&nbsp; [Herald](/herald/) &nbsp;·&nbsp; [Ward](/ward/)

</details>

`@vielzeug/clockwork` is a zero-dependency typed finite state machine. Define states, events, transitions, and async invokes once, then get a reactive, fully-typed machine instance with hierarchical states, delayed transitions, middleware, persistence, tracing, and debugging hooks—all with zero runtime overhead when unused.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/clockwork
```

```sh [npm]
npm install @vielzeug/clockwork
```

```sh [yarn]
yarn add @vielzeug/clockwork
```

:::

## Quick Start

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';

type Event = { type: 'START' } | { type: 'COMPLETE'; result: string };
type Context = { count: number };

const machine = defineMachine<'active' | 'idle', Context, Event>({
  context: { count: 0 },
  initial: 'idle',
  states: {
    active: {
      on: {
        COMPLETE: {
          actions: [({ context, event }) => { context.count = event.result.length; }],
          target: 'idle',
        },
      },
    },
    idle: {
      on: { START: { target: 'active' } },
    },
  },
});

const m = interpret(machine);

console.log(m.state.value);        // 'idle'
console.log(m.context.value.count); // 0

m.send({ type: 'START' });
m.send({ type: 'COMPLETE', result: 'hello' });

console.log(m.state.value);        // 'idle'
console.log(m.context.value.count); // 5
```

## Why Machine?

Manual state management leads to invalid state combinations, unreachable code paths, and complex conditional logic. FSMs eliminate these bugs by making state transitions explicit and exhaustive.

```ts
// Before — manual state management
type LoaderState = {
  data?: string;
  error?: Error;
  isRetrying?: boolean;
  status: 'error' | 'idle' | 'loading' | 'success';
};
// Multiple invalid state combinations are possible.

// After — FSM enforces valid state combinations
type Event = { type: 'FETCH' } | { type: 'DONE'; data: string } | { type: 'FAIL'; error: Error };

const loader = defineMachine<'error' | 'idle' | 'loading' | 'success', { data: string; error?: Error }, Event>({
  context: { data: '', error: undefined },
  initial: 'idle',
  states: {
    error: { on: { FETCH: { target: 'loading' } } },
    idle: { on: { FETCH: { target: 'loading' } } },
    loading: { on: { DONE: { target: 'success' }, FAIL: { target: 'error' } } },
    success: { on: { FETCH: { target: 'loading' } } },
  },
});
// Now success && error is impossible. State is always valid.
```

| Feature                    | Machine                                        | xstate              | zustand    |
| -------------------------- | ---------------------------------------------- | ------------------- | ---------- |
| Bundle size                | <PackageInfo package="clockwork" type="size" />  | ~15 KB              | ~2 KB      |
| Zero dependencies          | ✅                                             | ❌ 5+ deps          | ✅         |
| Typed discriminated events | ✅                                             | ⚠️ Partial          | ❌         |
| Reactive signals           | ✅ Native                                      | ❌ Observer pattern | ✅ Native  |
| Persistence adapter        | ✅ Pluggable                                   | ✅                  | ✅         |
| Hierarchical states        | ✅ Compound + leaf resolution                  | ✅                  | ❌         |
| Middleware pipeline        | ✅ Composable                                  | ❌                  | ✅         |
| Context isolation          | ✅ Cloned on every transition                  | ✅                  | ❌         |

**Use Machine when** you need predictable state machines with strict type safety, reactive integrations, and a minimal footprint in applications where state is defined upfront.

**Consider xstate when** you need visual state machine tooling or already have a large bundle budget.

## Features

- `defineMachine()` — Create immutable, validated FSM definitions
- `interpret()` — Spawn reactive machine instances from definitions
- **Shorthand transitions** — Single transition or array, your choice
- **Typed events** — Discriminated unions with TypeScript inference
- **Reactive state** — State and context are `@vielzeug/ripple` signals
- **Async invokes** — Native Promise support with onDone/onError handlers
- **Delayed transitions** — Timer-based `after` with guards and actions
- **Hierarchical states** — Compound states with automatic leaf resolution
- **Middleware** — Composable event interception pipeline
- **Persistence** — Snapshot save/load adapter
- **Tracing** — Ring buffer of transitions for debugging
- **Debug events** — Discriminated union callback with zero overhead when omitted
- **Event queue** — FIFO processing with configurable infinite-loop guard
- **Context isolation** — Cloned draft before every commit; machine is unchanged on validation failure
- **Subscribe** — Change-detection subscription without direct ripple dependency
- **Pure resolver** — Test transition logic independently with `resolveTransition()`

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
- [Herald](/herald/) — Typed event bus; complementary for event-driven architectures
- [Ward](/ward/) — RBAC engine; use alongside Machine for state-dependent permissions
- [Forge](/forge/) — Form state management; integrates with Machine for multi-step workflows

<!-- markdownlint-enable MD025 MD033 MD060 -->
