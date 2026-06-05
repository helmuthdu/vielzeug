---
title: Familiar — Typed Web Worker pools
description: Typed Web Worker pools with queuing, priorities, streaming, heartbeat, and testing utilities.
package: familiar
category: workers
keywords: [web-workers, pool, concurrency, offload, background, threading, timeout, streaming, priority]
related: [arsenal, ripple, herald]
exports:
  [
    createWorker,
    createModuleWorker,
    createTestWorker,
    WorkerError,
    WorkerTimeoutError,
    WorkerTaskError,
    WorkerQueueFullError,
  ]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="familiar" />

<img src="/logo-familiar.svg" alt="Familiar logo" width="156" class="logo-highlight"/>

# Worker

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/familiar` &nbsp;·&nbsp; **Category:** Workers

**Key exports:** `createWorker`, `createModuleWorker`, `createTestWorker`

**When to use:** Typed Web Worker pools with task queuing, priorities, per-task timeouts, AbortSignal cancellation, streaming, heartbeat monitoring, and in-process testing.

**Related:** [Arsenal](/arsenal/) · [Ripple](/ripple/) · [Herald](/herald/)

</details>

`@vielzeug/familiar` is a typed Web Worker pool with task queuing, priorities, per-task timeouts, streaming, heartbeat monitoring, and in-process testing.

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

// Single worker — processes one task at a time
const worker = createWorker<number[], number>((nums) => nums.reduce((a, b) => a + b, 0));
const sum = await worker.run([1, 2, 3, 4, 5]); // 15
worker.dispose();

// Worker pool — 4 concurrent slots with a timeout
const pool = createWorker<string, string>((text) => text.toUpperCase(), { concurrency: 4, timeout: 5000 });
const items = ['alpha', 'beta', 'gamma', 'delta'];
const results = await Promise.all(items.map((item) => pool.run(item)));
pool.dispose();

// Priority — higher values run first when tasks queue up
await pool.run(urgentTask, { priority: 10 });

// Typed errors — precise instanceof checks
import { WorkerTimeoutError, WorkerQueueFullError } from '@vielzeug/familiar';
try {
  await pool.run(input, { timeout: 100 });
} catch (err) {
  if (err instanceof WorkerTimeoutError) console.error(`Timed out after ${err.timeoutMs}ms`);
  if (err instanceof WorkerQueueFullError) console.error(`Queue full (max ${err.maxQueue})`);
}
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

| Feature           | Worker                                         | Comlink | workerpool |
| ----------------- | ---------------------------------------------- | ------- | ---------- |
| Bundle size       | <PackageInfo package="familiar" type="size" /> | ~2 kB   | ~10 kB     |
| Worker pools      | ✅                                             | ❌      | ✅         |
| Typed payloads    | ✅                                             | Partial | ❌         |
| Timeout support   | ✅                                             | ❌      | ✅         |
| Priority queue    | ✅                                             | ❌      | ❌         |
| AbortSignal       | ✅ Queued tasks                                | ❌      | ❌         |
| Streaming         | ✅ `runStream()`                               | ❌      | ❌         |
| Heartbeat         | ✅ Auto for inline workers                     | ❌      | ❌         |
| Typed errors      | ✅ `instanceof WorkerTimeoutError` etc.        | ❌      | ❌         |
| Testing utilities | ✅                                             | ❌      | ❌         |
| Module workers    | ✅ `createModuleWorker`                        | ✅      | ❌         |
| Zero dependencies | ✅                                             | ✅      | ❌         |

**Use Worker when** you need typed, awaitable Web Workers with pooling, priorities, timeouts, streaming, and cancellation.

**Consider Comlink** if you only need a simple typed RPC proxy over a single Worker without pooling, priority, or timeout requirements.

## Features

- **Type-safe** — payload types flow from `TaskFn` declaration to every `run()` call
- **Web Worker backed** — CPU-bound work runs off the main thread, no jank
- **Pool support** — create N workers via the `concurrency` option with built-in queuing
- **Priority queue** — pass `priority` per-run; higher values run first with FIFO tiebreaking
- **Timeout support** — pool-level or per-run `timeout` rejects with `WorkerTimeoutError`
- **Heartbeat monitoring** — `heartbeatTimeout` kills tasks that stop responding, with auto-heartbeats for inline workers
- **AbortSignal** — cancel queued tasks with the standard `AbortController` API
- **Streaming** — `runStream()` for tasks that yield multiple partial results
- **Batch** — `batch()` runs inputs through the pool and yields results ordered or as-completed
- **Task groups** — `group()` ties related tasks to a shared abort and drain lifecycle
- **Transferables** — move large buffers to the Worker without a structured-clone copy
- **Prime** — pre-initialize worker slots to eliminate first-task latency
- **Metrics** — `active`, `queued`, `utilization`, `completed`, `failed` counters for observability
- **Typed error hierarchy** — `WorkerTimeoutError`, `WorkerTaskError`, `WorkerQueueFullError`, and more
- **`[Symbol.dispose]`** — `using` keyword support (ES2025 explicit resource management)
- **Module workers** — `createModuleWorker` loads a real `.js/.ts` module file as the Worker
- **Testing utilities** — `createTestWorker` runs tasks in-process with call recording
- **Zero dependencies** — no supply chain risk, minimal bundle size

## Compatibility

| Environment | Support                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| Browser     | ✅ Full support                                                                  |
| Node.js     | ⚠️ `createWorker()` is safe; `run()` requires a compatible Worker implementation |
| SSR         | ⚠️ `createWorker()` is safe; `run()` requires a compatible Worker implementation |
| Deno        | ⚠️ Support depends on Worker compatibility                                       |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Arsenal](/arsenal/) — utility functions useful inside self-contained task functions
- [Ripple](/ripple/) — pair with reactive signals to drive UI from worker pool metrics
- [Herald](/herald/) — emit typed events from worker task functions back to the main thread

<!-- markdownlint-enable MD025 MD033 MD060 -->
