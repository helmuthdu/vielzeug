---
title: Clockwork — Typed finite state machine for TypeScript
description: Zero-dependency typed FSM with async invokes, delayed transitions, hierarchical states, middleware, reactive state, persistence, tracing, and full TypeScript support.
package: clockwork
category: state
keywords:
  [state-machine, finite-state, reactive, typed, async-tasks, persistence, debugging, hierarchical, interceptors]
related: [ripple, herald, ward]
exports:
  [
    createMachine,
    ClockworkError,
    SendResult,
    InterceptorFn,
    InvokeArgs,
    AfterEvent,
    AfterActionFn,
    TransitionInput,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="clockwork" />

## Why Clockwork?

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
import { createMachine } from '@vielzeug/clockwork';
type Event = { type: 'FETCH' } | { type: 'DONE'; data: string } | { type: 'FAIL'; error: Error };

const loader = createMachine({
  context: { data: '' as string, error: undefined as Error | undefined },
  initial: 'idle',
  states: {
    error: { on: { FETCH: { target: 'loading' } } },
    idle: { on: { FETCH: { target: 'loading' } } },
    loading: { on: { DONE: { target: 'success' }, FAIL: { target: 'error' } } },
    success: { on: { FETCH: { target: 'loading' } } },
  },
}).start();
// Now success && error is impossible. State is always valid.
```

| Feature                    | Clockwork                                                             | xstate                                                      | zustand                                           |
| -------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| Bundle size                | <PackageInfo package="clockwork" type="size" />                       | ~15 KB                                                      | ~2 KB                                             |
| Zero dependencies          | <ore-icon name="check" size="16"></ore-icon>                            | <ore-icon name="x" size="16"></ore-icon> 5+ deps              | <ore-icon name="check" size="16"></ore-icon>        |
| Typed discriminated events | <ore-icon name="check" size="16"></ore-icon>                            | <ore-icon name="triangle-alert" size="16"></ore-icon> Partial | <ore-icon name="x" size="16"></ore-icon>            |
| Reactive signals           | <ore-icon name="check" size="16"></ore-icon> Native                     | <ore-icon name="x" size="16"></ore-icon> Observer pattern     | <ore-icon name="check" size="16"></ore-icon> Native |
| Persistence adapter        | <ore-icon name="check" size="16"></ore-icon> Pluggable                  | <ore-icon name="check" size="16"></ore-icon>                  | <ore-icon name="check" size="16"></ore-icon>        |
| Hierarchical states        | <ore-icon name="check" size="16"></ore-icon> Compound + leaf resolution | <ore-icon name="check" size="16"></ore-icon>                  | <ore-icon name="x" size="16"></ore-icon>            |
| Interceptor pipeline       | <ore-icon name="check" size="16"></ore-icon> Pure functions             | <ore-icon name="x" size="16"></ore-icon>                      | <ore-icon name="check" size="16"></ore-icon>        |
| Context isolation          | <ore-icon name="check" size="16"></ore-icon> Cloned on every transition | <ore-icon name="check" size="16"></ore-icon>                  | <ore-icon name="x" size="16"></ore-icon>            |

<div class="decision-callout">

**Use Clockwork when** you need predictable state machines with strict type safety, reactive integrations, and a minimal footprint in applications where state is defined upfront.

**Consider xstate when** you need visual state machine tooling or already have a large bundle budget.

</div>

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
import { createMachine } from '@vielzeug/clockwork';

type Event = { type: 'START' } | { type: 'COMPLETE'; result: string };

const m = createMachine({
  context: { count: 0 },
  initial: 'idle',
  states: {
    active: {
      on: {
        COMPLETE: {
          actions: [
            ({ context, event }) => {
              context.count = event.result.length;
            },
          ],
          target: 'idle',
        },
      },
    },
    idle: {
      on: { START: { target: 'active' } },
    },
  },
}).start();

console.log(m.state.value); // 'idle'
console.log(m.context.value.count); // 0

console.log(m.send({ type: 'START' }).status); // 'transitioned'
console.log(m.send({ type: 'COMPLETE', result: 'hello' }).status); // 'transitioned'

console.log(m.state.value); // 'idle'
console.log(m.context.value.count); // 5
```

## Features

<div class="features-grid">

- **`createMachine()`** — Validate config; returns a reusable `MachineDefinition` handle
- **`.start(options?)`** — Spawn independent running instances from a definition
- **`.resolve(input, options?)`** — Pure transition resolver for testing (no side effects)
- **Shorthand transitions** — Single transition or array, your choice
- **Typed events** — Discriminated unions with TypeScript inference
- **`SendResult`** — `send()` returns `{ status }` where `status` is `'transitioned'` | `'queued'` | `'rejected'`
- **Reactive state** — State and context are `@vielzeug/ripple` signals
- **Async invokes** — Native Promise support; `onDone`/`onError` receive `(result, context)`
- **Delayed transitions** — Timer-based `after` with guards and actions
- **Hierarchical states** — Compound states with automatic leaf resolution
- **Interceptors** — Pure event interceptors — return event or `null` to block
- **Persistence** — Snapshot save/load adapter
- **Tracing** — Ring buffer; auto-enabled (50 entries) when `onDebug` is set
- **Debug events** — Unified discriminated union `onDebug` callback; use `debugMachine()` from `@vielzeug/clockwork/devtools` for pre-wired console logging
- **Event queue** — FIFO processing with configurable infinite-loop guard
- **Context isolation** — Cloned draft before every commit; machine is unchanged on validation failure
- **Subscribe** — Change-detection subscription without direct ripple dependency

</div>

::: tip Running on the server
Creating machines per-request in an SSR handler? See [Server-Side Rendering](./usage.md#server-side-rendering) for the one-time setup that keeps concurrent requests isolated.
:::

## Sub-paths

| Import                         | Purpose                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `@vielzeug/clockwork`          | All exports and types                                   |
| `@vielzeug/clockwork/devtools` | `debugMachine` — pre-wired console logging (dev only) |

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — Reactive signals and effects; core reactivity layer for Clockwork
- [Herald](/herald/) — Typed event bus; complementary for event-driven architectures
- [Ward](/ward/) — RBAC engine; use alongside Clockwork for state-dependent permissions
- [Forge](/forge/) — Form state management; integrates with Clockwork for multi-step workflows

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
