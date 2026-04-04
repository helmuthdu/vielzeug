---
title: Workit — Web Workers made type-safe
description: Thin, type-safe abstraction over Web Workers with task queuing, pooling, timeouts, and cancellation.
---

<PackageBadges package="workit" />

<img src="/logo-workit.svg" alt="Workit logo" width="156" class="logo-highlight"/>

**Workit** wraps Web Workers in a clean, fully typed async API. Define a task function once and workit handles worker creation, queuing, timeouts, cancellation, and pooling.

<!-- Search keywords: worker pool, web worker wrapper, background task runner. -->

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
const worker = createWorker<number[], number>((nums) => nums.reduce((a, b) => a + b, 0));

const sum = await worker.run([1, 2, 3, 4, 5]); // 15
worker.dispose();

// Worker pool — 4 concurrent workers with a timeout
const pool = createWorker<string, string>((text) => text.toUpperCase(), { concurrency: 4, timeout: 5000 });

const items = ['alpha', 'beta', 'gamma', 'delta'];
const results = await Promise.all(items.map((item) => pool.run(item)));
pool.dispose();
```

## Why Workit?

Raw Web Workers require blob-URL boilerplate, untyped `postMessage`/`onmessage` pairs, and no built-in pooling, timeouts, or cancellation.

```ts
// Before — raw Web Worker
const blob = new Blob([`onmessage = (e) => postMessage(e.data * 2);`]);
const rawWorker = new Worker(URL.createObjectURL(blob));
rawWorker.postMessage(21);
rawWorker.onmessage = (e) => console.log(e.data); // 42 — untyped, no await, no error handling

// After — Workit
import { createWorker } from '@vielzeug/workit';
const typedWorker = createWorker<number, number>((n) => n * 2);
console.log(await typedWorker.run(21)); // 42 — typed, awaitable, error-safe
typedWorker.dispose();
```

| Feature           | Workit                                       | Comlink | workerpool |
| ----------------- | -------------------------------------------- | ------- | ---------- |
| Bundle size       | <PackageInfo package="workit" type="size" /> | ~2 kB   | ~10 kB     |
| Worker pools      | ✅                                           | ❌      | ✅         |
| Typed payloads    | ✅                                           | Partial | ❌         |
| Timeout support   | ✅                                           | ❌      | ✅         |
| AbortSignal       | ✅ Queued tasks                              | ❌      | ❌         |
| Testing utilities | ✅                                           | ❌      | ❌         |
| Zero dependencies | ✅                                           | ✅      | ❌         |

**Use Workit when** you need typed, awaitable Web Workers with pooling, timeouts, and cancellation.

**Consider Comlink** if you only need a simple typed RPC proxy over a single Worker without pooling or timeout requirements.

## Features

- **Type-safe** — payload types flow from `TaskFn` declaration to every `run()` call
- **Web Worker backed** — CPU-bound work runs off the main thread, no jank
- **Pool support** — create N workers via the `concurrency` option with built-in queuing
- **Timeout support** — reject tasks that exceed a configurable time limit
- **AbortSignal** — cancel queued tasks with the standard `AbortController` API
- **Transferables** — move large buffers to the Worker without a structured-clone copy
- **`[Symbol.dispose]`** — `using` keyword support (ES2025 explicit resource management)
- **`WorkerError` hierarchy** — single `instanceof WorkerError` covers all error types
- **Testing utilities** — `createTestWorker` runs tasks in-process with call recording
- **Zero dependencies** — no supply chain risk, minimal bundle size

## Compatibility

- Browser: full support.
- Node.js: `createWorker()` is safe, but `run()` requires a compatible Worker implementation.
- SSR: `createWorker()` is safe, but `run()` requires a compatible Worker implementation.
- Deno: support depends on Worker compatibility.

## Prerequisites

- Browser or compatible runtime with Web Worker support for off-main-thread execution.
- Self-contained task functions (no closure over outer module state).
- In non-browser runtimes, expect `run()` to reject with `WorkerError` unless a compatible Worker implementation exists.

## See Also

- [Fetchit](/fetchit/)
- [Stateit](/stateit/)
- [Eventit](/eventit/)
