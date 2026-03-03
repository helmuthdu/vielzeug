---
title: Snapit — Framework-agnostic reactive state management
description: Tiny, type-safe state management with reactive subscriptions, computed values, and transactions. Zero dependencies, works everywhere.
---

<PackageBadges package="snapit" />

<img src="/logo-snapit.svg" alt="Snapit Logo" width="156" class="logo-highlight"/>

# Snapit

**Snapit** is a tiny, zero-dependency state management library with reactive subscriptions, computed values, and transactions. Works with any JavaScript framework—or none at all.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/snapit
```

```sh [npm]
npm install @vielzeug/snapit
```

```sh [yarn]
yarn add @vielzeug/snapit
```

:::

## Features

- **Reactive subscriptions** — full-state or selective, with custom equality
- **Computed values** — derived state that caches and updates automatically
- **Transactions** — batch multiple updates into a single notification
- **Async support** — `set()` accepts async updater functions
- **Scoped stores** — create child states for isolated testing contexts
- **Zero dependencies** — no supply chain risk, minimal bundle size
- **Framework agnostic** — React, Vue, Svelte, or vanilla JS

## Quick Start

```ts
import { createSnapshot } from '@vielzeug/snapit';

const counter = createSnapshot({ count: 0 });

// React to changes
counter.subscribe((curr, prev) => {
  console.log(`${prev.count} → ${curr.count}`);
});

// Update state (partial merge)
counter.set({ count: 1 });

// Update with a function
counter.set((s) => ({ count: s.count + 1 }));

// Async updates work too
await counter.set(async (s) => ({ count: await fetchCount() }));

// Read state
const { count } = counter.get();
```

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Concepts, patterns, alternatives, and testing |
| [API Reference](./api.md) | Complete type signatures and parameter docs |
| [Examples](./examples.md) | Real-world recipes and framework integrations |
