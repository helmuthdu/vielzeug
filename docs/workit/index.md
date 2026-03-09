---
title: Workit — Web Workers made type-safe
description: Thin, type-safe abstraction over Web Workers with task queuing, pooling, timeouts, cancellation, and a graceful main-thread fallback.
---

<PackageBadges package="workit" />

<img src="/logo-workit.svg" alt="Workit Logo" width="156" class="logo-highlight"/>

# Workit

**Workit** wraps Web Workers in a clean, fully-typed async API. Define a task function once — workit handles worker creation, message passing, timeouts, cancellation, and pooling. Falls back to main-thread execution gracefully when Workers are unavailable (SSR, tests).

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/workit
```

```sh [npm]
npm install @vielzeug/workit
```

```sh [yarn]
yarn add @vielzeug/workit
```

:::

## Quick Start

```ts
import { createWorker } from '@vielzeug/workit';

// Single worker — process one task at a time
const worker = createWorker<number[], number>(
  (nums) => nums.reduce((a, b) => a + b, 0),
);

const sum = await worker.run([1, 2, 3, 4, 5]); // 15
worker.dispose();

// Worker pool — 4 concurrent workers with a timeout
const pool = createWorker<string, string>(
  (text) => text.toUpperCase(),
  { size: 4, timeout: 5000 },
);

const results = await Promise.all(items.map((item) => pool.run(item)));
pool.dispose();
```

## Features

- **Type-safe** — payload types flow from `TaskFn` declaration to every `run()` call
- **Web Worker backed** — CPU-bound work runs off the main thread, no jank
- **Graceful fallback** — runs tasks on the main thread when Workers are unavailable
- **Pool support** — create N workers via the `size` option with built-in queuing
- **Timeout support** — reject tasks that exceed a configurable time limit
- **AbortSignal** — cancel queued tasks with the standard `AbortController` API
- **Transferables** — move large buffers to the Worker without a structured-clone copy
- **`isNative`** — know at runtime whether a real Worker is active or fallback is in use
- **`[Symbol.dispose]`** — `using` keyword support (ES2025 explicit resource management)
- **`WorkerError` hierarchy** — single `instanceof WorkerError` covers all error types
- **Testing utilities** — `createTestWorker` runs tasks in-process with call recording
- **Zero dependencies** — no supply chain risk, minimal bundle size

## Next Steps

|                           |                                                                              |
| ------------------------- | ---------------------------------------------------------------------------- |
| [Usage Guide](./usage.md) | Task functions, pools, timeouts, AbortSignal, fallback mode, and testing     |
| [API Reference](./api.md) | Complete type signatures and method documentation                            |
| [Examples](./examples.md) | Image processing, data pipelines, cancellable batches, and React integration |
