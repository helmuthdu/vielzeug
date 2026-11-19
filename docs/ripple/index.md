---
title: 'Ripple: Reactive graphs'
description: Framework-agnostic signals, effects, async resources, scopes, and structural bridges.
package: ripple
category: state
keywords: [reactive, signals, computed, effects, graph, scope, batch, watch]
related: [ore, clockwork, ledger]
exports: [signal, computed, effect, createScope, watch, resource, fromSubscribable]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ripple" />

## Why Ripple?

Hand-rolled reactive state spreads subscription, cleanup, and derived-value rules across application code. Ripple provides one shared reactive runtime with fine-grained dependencies, while scopes give related work explicit lifetimes and error boundaries.

```ts
// Before
let count = 0;
const listeners = new Set<() => void>();

function setCount(next: number) {
  count = next;
  for (const listener of listeners) listener();
}

// After
import { computed, createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope();
const count = signal(0);
scope.run(() => {
  const doubled = computed(() => count.value * 2);
  effect(() => console.log(doubled.value));
});

count.value = 1;
scope.dispose();
```

| Feature                     | Ripple                                       | Zustand                                      | Jotai                                    |
| --------------------------- | -------------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| Bundle size                 | <PackageInfo package="ripple" type="size" /> | ~3.5 kB                                      | ~7 kB                                    |
| Zero dependencies           | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon> |
| Framework-agnostic          | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | React-first                              |
| Scoped ownership            | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon> |
| Fine-grained derived values | <ore-icon name="check" size="16"></ore-icon> | Selectors                                    | Atoms                                    |

<div class="decision-callout">

**Use Ripple when** you need framework-independent state with explicit scope lifetimes and small composable primitives.

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

Create a scope, derive a value, observe it, then dispose the scope when its owner ends.

```ts
import { computed, createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope({ name: 'counter' });
const count = signal(0);

scope.run(() => {
  const doubled = computed(() => count.value * 2);
  effect(() => console.log(doubled.value));
});

count.value = 1;
scope.dispose();
```

## Features

<div class="features-grid">

- `createScope({ name, onError })` groups owned reactive work and routes callback failures through its scope tree.
- `signal()` stores writable values with configurable equality.
- `computed()` derives lazy, glitch-free read-only values: at most once per flush, never from a stale source.
- `effect()` reacts to dependency changes with cleanup support.
- `onCleanup()` runs a callback when the active scope or effect run is disposed.
- `batch()` coalesces synchronous writes and notifications.
- `computed()` rejects signal writes during a derive.
- `watch()` observes one selected source transition.
- `resource()` owns focused latest-request async state.
- `fromSubscribable()` creates a disposable bridge for external `{ getSnapshot, subscribe }` sources.
- `RippleError`, `RippleCycleError`, and `RippleDisposedError` distinguish package-originated failures.

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

- [Ore](/ore/): uses Ripple signals and effects for web-component reactivity.
- [Clockwork](/clockwork/): exposes machine state through reactive Ripple values.
- [Ledger](/ledger/): adds command-based undo and redo beside Ripple state.

</div>

<!-- markdownlint-enable -->
