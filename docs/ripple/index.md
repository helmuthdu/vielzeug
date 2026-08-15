---
title: Ripple — Reactive graphs
description: Framework-agnostic signals, derived values, effects, scopes, watchers, and async resources.
package: ripple
category: state
keywords: [reactive, signals, computed, effects, graph, scope, batch, watch, resource, async]
related: [ore, clockwork, ledger]
exports: [createRipple, signal, computed, effect, batch, createScope, untrack, watch, resource, isReactive]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ripple" />

## Why Ripple?

Hand-rolled reactive state spreads subscription, cleanup, and derived-value rules across application code. Ripple gives you one graph boundary with explicit disposal and fine-grained dependencies while keeping rendering and routing outside the runtime.

```ts
// Before
let count = 0;
const listeners = new Set<() => void>();

function setCount(next: number) {
  count = next;
  for (const listener of listeners) listener();
}

// After
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const count = ripple.signal(0);
const doubled = ripple.computed(() => count.value * 2);
const stop = ripple.effect(() => console.log(doubled.value));

count.value = 1;
stop.dispose();
ripple.dispose();
```

| Feature | Ripple | Zustand | Jotai |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="ripple" type="size" /> | ~3.5 kB | ~7 kB |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Framework-agnostic | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | React-first |
| Explicit graph lifetime | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Fine-grained derived values | <ore-icon name="check" size="16"></ore-icon> | Selectors | Atoms |

<div class="decision-callout">

**Use Ripple when** you need framework-independent state with explicit graph lifetime and small composable primitives.

**Consider a framework store when** component bindings, server cache, or framework-specific tooling matter more than portable reactive state.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/ripple
```

```sh [npm]
npm install @vielzeug/ripple
```

```sh [yarn]
yarn add @vielzeug/ripple
```

:::

## Quick Start

Create one graph, derive a value, observe it, then dispose resources when the graph lifetime ends.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const count = ripple.signal(0);
const doubled = ripple.computed(() => count.value * 2);
const stop = ripple.effect(() => console.log(doubled.value));

ripple.batch(() => {
  count.value = 1;
  count.value = 2;
});

stop.dispose();
ripple.dispose();
```

## Features

<div class="features-grid">

- `createRipple()` creates an isolated graph and lifetime boundary.
- `signal()` stores writable values with configurable equality.
- `computed()` derives lazy read-only values.
- `effect()` reacts to dependency changes with cleanup support.
- `batch()` coalesces synchronous writes and notifications.
- `createScope()` groups owned reactive work.
- `watch()` observes one selected source transition.
- `resource()` loads async values with stale-work cancellation.

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

- [Ore](/ore/) — uses Ripple signals and effects for web-component reactivity.
- [Clockwork](/clockwork/) — exposes machine state through reactive Ripple values.
- [Ledger](/ledger/) — adds command-based undo and redo beside Ripple state.

</div>

<!-- markdownlint-enable -->
