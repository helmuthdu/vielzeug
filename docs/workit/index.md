---
title: Workit — Typed Web Worker abstraction for TypeScript
description: Tiny, type-safe Web Worker wrapper with pooling, queuing, timeouts, AbortSignal support, and a main-thread fallback for SSR and tests.
---

<PackageBadges package="workit" />

# Workit

**Workit** makes Web Workers ergonomic. Define a task function once — workit handles Worker creation, serialization, lifecycle, pooling, and error propagation. Falls back to Promise-based execution in environments where Workers are unavailable.

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

## Features

- **Type-safe** — `TaskFn<TInput, TOutput>` types flow through every `run()` call
- **Web Worker backed** — CPU-bound work runs off the main thread
- **Graceful fallback** — runs in the main thread when Workers aren't available (SSR, tests)
- **Worker pool** — distribute tasks across N workers with a built-in queue
- **Timeout support** — reject tasks that run too long
- **AbortSignal** — cancel queued tasks with the standard `AbortController` API
- **Testing utilities** — `createTestWorker` runs tasks synchronously with call recording
- **Zero dependencies** — minimal bundle, no supply chain risk

## Quick Start

```ts
import { createWorker, createWorkerPool } from '@vielzeug/workit';

// Single worker — one task at a time
const worker = createWorker<number[], number>(
  (nums) => nums.reduce((a, b) => a + b, 0),
);
const sum = await worker.run([1, 2, 3, 4, 5]); // 15
worker.terminate();

// Worker pool — 4 concurrently running tasks
const pool = createWorkerPool<{ n: number }, number>(
  ({ n }) => fibonacci(n),
  { size: 4 },
);
const results = await pool.runAll([{ n: 35 }, { n: 36 }, { n: 37 }]);
pool.terminate();
```

## Documentation

- [Usage Guide](./usage.md) — task functions, pool, timeouts, AbortSignal, testing
- [API Reference](./api.md) — full type signatures
- [Examples](./examples.md) — image processing, data transformation, React integration

## License

MIT © [Vielzeug](https://github.com/helmuthdu/vielzeug)
