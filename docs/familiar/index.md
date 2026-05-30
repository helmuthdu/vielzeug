---
title: Familiar — Web Workers made type-safe
description: Thin, type-safe abstraction over Web Workers with task queuing, pooling, timeouts, and cancellation.
package: familiar
category: workers
keywords: [web-workers, pool, concurrency, offload, background, threading, timeout]
related: [arsenal, ripple, herald]
exports: [createWorker, createTestWorker]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="familiar" />

<img src="/logo-familiar.svg" alt="Familiar logo" width="156" class="logo-highlight"/>

# Worker

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/familiar` &nbsp;·&nbsp; **Category:** Workers

**Key exports:** `createWorker`, `createTestWorker`

**When to use:** Type-safe Web Worker abstraction with task queuing, pooling, timeouts, AbortSignal cancellation, and graceful main-thread fallback.

**Related:** [Arsenal](/arsenal/) · [Ripple](/ripple/) · [Herald](/herald/)

</details>

`@vielzeug/familiar` is a thin, type-safe abstraction over Web Workers with task queuing, pooling, timeouts, and AbortSignal cancellation.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/familiar
```

```sh [npm]
npm install @vielzeug/familiar
```

```sh [yarn]
yarn add @vielzeug/familiar
```

:::

## Quick Start

```ts
import { createWorker } from '@vielzeug/familiar';

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

## Why Worker?

Raw Web Workers require blob-URL boilerplate, untyped `postMessage`/`onmessage` pairs, and no built-in pooling, timeouts, or cancellation.

```ts
// Before — raw Web Worker
const blob = new Blob([`onmessage = (e) => postMessage(e.data * 2);`]);
const rawWorker = new Worker(URL.createObjectURL(blob));
rawWorker.postMessage(21);
rawWorker.onmessage = (e) => console.log(e.data); // 42 — untyped, no await, no error handling

// After — Worker
import { createWorker } from '@vielzeug/familiar';
const typedWorker = createWorker<number, number>((n) => n * 2);
console.log(await typedWorker.run(21)); // 42 — typed, awaitable, error-safe
typedWorker.dispose();
```

| Feature           | Worker                                       | Comlink | workerpool |
| ----------------- | -------------------------------------------- | ------- | ---------- |
| Bundle size       | <PackageInfo package="familiar" type="size" /> | ~2 kB   | ~10 kB     |
| Worker pools      | ✅                                           | ❌      | ✅         |
| Typed payloads    | ✅                                           | Partial | ❌         |
| Timeout support   | ✅                                           | ❌      | ✅         |
| AbortSignal       | ✅ Queued tasks                              | ❌      | ❌         |
| Testing utilities | ✅                                           | ❌      | ❌         |
| Zero dependencies | ✅                                           | ✅      | ❌         |

**Use Worker when** you need typed, awaitable Web Workers with pooling, timeouts, and cancellation.

**Consider Comlink** if you only need a simple typed RPC proxy over a single Worker without pooling or timeout requirements.

## Features

- **Type-safe** — payload types flow from `TaskFn` declaration to every `run()` call
- **Web Worker backed** — CPU-bound work runs off the main thread, no jank
- **Pool support** — create N workers via the `concurrency` option with built-in queuing
- **Timeout support** — reject tasks that exceed a configurable time limit
- **AbortSignal** — cancel queued tasks with the standard `AbortController` API
- **Transferables** — move large buffers to the Worker without a structured-clone copy
- **Prime** — pre-initialize worker slots with `await pool.prime()` to eliminate first-task latency
- **Metrics** — `active`, `queued`, `utilization`, and `completed` counters for observability
- **`[Symbol.dispose]`** — `using` keyword support (ES2025 explicit resource management)
- **`WorkerError` hierarchy** — single `instanceof WorkerError` covers all error types
- **Testing utilities** — `createTestWorker` runs tasks in-process with call recording
- **Zero dependencies** — no supply chain risk, minimal bundle size

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅ Full support |
| Node.js     | ⚠️ `createWorker()` is safe; `run()` requires a compatible Worker implementation |
| SSR         | ⚠️ `createWorker()` is safe; `run()` requires a compatible Worker implementation |
| Deno        | ⚠️ Support depends on Worker compatibility |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Arsenal](/arsenal/) — utility functions useful inside self-contained task functions
- [Ripple](/ripple/) — pair with reactive signals to drive UI from worker pool metrics
- [Herald](/herald/) — emit typed events from worker task functions back to the main thread

<!-- markdownlint-enable MD025 MD033 MD060 -->
