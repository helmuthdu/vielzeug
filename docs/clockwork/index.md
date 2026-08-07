---
title: Clockwork — Typed finite state machines for TypeScript
description: Framework-neutral typed state machines with pure transitions, actor-owned runtime work, timers, invokes, and explicit effects.
package: clockwork
category: state
keywords: [state-machine, finite-state, typed, actor, async-tasks]
related: [herald, ripple, ward]
exports: [defineMachine, ClockworkError, Machine, Actor, MachineConfig, MachineSnapshot, TransitionResult]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="clockwork" />

## Why Clockwork?

Application workflows often mix state changes with timers, requests, rendering, and cleanup. Clockwork keeps transition logic pure while each disposable actor owns runtime work. You can test state decisions without starting effects or invokes.

```ts
import { defineMachine } from '@vielzeug/clockwork';

// Before
if (status === 'idle') status = 'loading';
fetchItems().then((items) => {
  status = 'ready';
  data = items;
});

// After
type Event = { type: 'FETCH' } | { items: string[]; type: 'DONE' };
const machine = defineMachine<{ items: string[] }, Event>()({
  context: { items: [] },
  initial: 'idle',
  states: {
    idle: { on: { FETCH: { target: 'loading' } } },
    loading: {
      invoke: [{
        src: ({ signal }) => fetch('/api/items', { signal }).then((response) => response.json() as Promise<string[]>),
        onDone: ({ result }) => ({ items: result, type: 'DONE' }),
      }],
      on: { DONE: { reduce: ({ event }) => ({ items: event.items }), target: 'ready' } },
    },
    ready: {},
  },
});
```

| Feature | Clockwork | XState | Zustand |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="clockwork" type="size" /> | Larger actor/statechart runtime | Smaller store runtime |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Pure transition API | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> Statechart-focused | <ore-icon name="x" size="16"></ore-icon> |
| Owned cancellation | <ore-icon name="check" size="16"></ore-icon> Actor disposal | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Framework coupling | <ore-icon name="check" size="16"></ore-icon> None | <ore-icon name="check" size="16"></ore-icon> None | <ore-icon name="check" size="16"></ore-icon> None |

<div class="decision-callout">

**Use Clockwork when** your feature has explicit workflow states, cancellable work, or effects that must run after a state commit.

**Consider XState when** you need statecharts, visual tooling, or its broader actor ecosystem.

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

Define the context and event union, create an actor, observe its snapshot, then dispose it when its owner ends.

```ts
import { defineMachine } from '@vielzeug/clockwork';

type Event = { type: 'DEC' } | { type: 'INC' };

const counter = defineMachine<{ count: number }, Event>()({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DEC: { reduce: ({ context }) => ({ count: context.count - 1 }), target: 'idle' },
        INC: { reduce: ({ context }) => ({ count: context.count + 1 }), target: 'idle' },
      },
    },
  },
});

using actor = counter.createActor();
actor.subscribe((snapshot) => console.log(snapshot));
actor.send({ type: 'INC' });
// { context: { count: 1 }, state: 'idle' }
```

## Features

<div class="features-grid">

- **`defineMachine()`** — validates and compiles one flat machine definition.
- **`machine.transition()`** — evaluates a transition without actor runtime work.
- **`machine.createActor()`** — creates isolated, disposable runtime ownership.
- **`reduce`** — returns a replacement context from a transition.
- **`effects`** — run only after the actor commits and notifies subscribers.
- **`invoke`** — runs cancellable asynchronous work on state entry.
- **`after`** — schedules cancellable delayed transitions.
- **`actor.snapshot`** — exposes the current readonly state/context value.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Herald](/herald/) — publish events between independent actors without coupling machine definitions.
- [Ripple](/ripple/) — bridge actor snapshots into a reactive graph when you need fine-grained rendering.
- [Ward](/ward/) — call authorization predicates from transition guards.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
