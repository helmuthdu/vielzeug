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
    task,
    createTestWorker,
    FamiliarError,
    FamiliarTimeoutError,
    FamiliarTaskError,
    FamiliarQueueFullError,
    FamiliarTerminatedError,
    FamiliarRuntimeError,
    FamiliarInvalidOptionsError,
  ]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="familiar" />

## Why Familiar?

Raw Web Workers require blob-URL boilerplate, untyped `postMessage`/`onmessage` pairs, and no built-in pooling, timeouts, or cancellation.

```ts
// Before — raw Web Worker
const blob = new Blob([`onmessage = (e) => postMessage(e.data * 2);`]);
const rawWorker = new Worker(URL.createObjectURL(blob));
rawWorker.postMessage(21);
rawWorker.onmessage = (e) => console.log(e.data); // 42 — untyped, no await, no error handling

// After — familiar
import { createWorker, task } from '@vielzeug/familiar';
const double = task<number, number>((n) => n * 2);
const typedWorker = createWorker(double);
console.log(await typedWorker.run(21)); // 42 — typed, awaitable, error-safe
typedWorker.dispose();
```

| Feature           | Worker                                                                          | Comlink                                    | workerpool                                 |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Bundle size       | <PackageInfo package="familiar" type="size" />                                  | ~2 kB                                      | ~10 kB                                     |
| Worker pools      | <ore-icon name="check" size="16"></ore-icon>                                      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="check" size="16"></ore-icon> |
| Typed payloads    | <ore-icon name="check" size="16"></ore-icon>                                      | Partial                                    | <ore-icon name="x" size="16"></ore-icon>     |
| Timeout support   | <ore-icon name="check" size="16"></ore-icon>                                      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="check" size="16"></ore-icon> |
| Priority queue    | <ore-icon name="check" size="16"></ore-icon>                                      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| AbortSignal       | <ore-icon name="check" size="16"></ore-icon> Queued tasks                         | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Streaming         | <ore-icon name="check" size="16"></ore-icon> `runStream()`                        | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Heartbeat         | <ore-icon name="check" size="16"></ore-icon> Auto for inline workers              | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Typed errors      | <ore-icon name="check" size="16"></ore-icon> `instanceof FamiliarTimeoutError` etc. | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Testing utilities | <ore-icon name="check" size="16"></ore-icon>                                      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Module workers    | <ore-icon name="check" size="16"></ore-icon> `createModuleWorker`                 | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon>                                      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     |

<div class="decision-callout">

**Use Worker when** you need typed, awaitable Web Workers with pooling, priorities, timeouts, streaming, and cancellation.

**Consider Comlink** if you only need a simple typed RPC proxy over a single Worker without pooling, priority, or timeout requirements.

</div>

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
import { createWorker, task, FamiliarTimeoutError, FamiliarQueueFullError } from '@vielzeug/familiar';

// Wrap the function with task() to mark it as self-contained (safe to serialize)
const sum = task<number[], number>((nums) => nums.reduce((a, b) => a + b, 0));

// Single worker — processes one task at a time
const worker = createWorker(sum);
console.log(await worker.run([1, 2, 3, 4, 5])); // 15
worker.dispose();

// Worker pool — 4 concurrent slots with a timeout
const upper = task<string, string>((text) => text.toUpperCase());
const pool = createWorker(upper, { concurrency: 4, timeout: 5000 });
const items = ['alpha', 'beta', 'gamma', 'delta'];
const results = await Promise.all(items.map((item) => pool.run(item)));
pool.dispose();

// Priority — higher values run first when tasks queue up
await pool.run(urgentTask, { priority: 10 });

// Typed errors — precise instanceof checks
try {
  await pool.run(input, { timeout: 100 });
} catch (err) {
  if (err instanceof FamiliarTimeoutError) console.error(`Timed out after ${err.timeoutMs}ms`);
  if (err instanceof FamiliarQueueFullError) console.error(`Queue full (max ${err.maxQueue})`);
}
```

## Features

<div class="features-grid">

- **Type-safe** — payload types flow from `TaskFn` declaration to every `run()` call
- **Web Worker backed** — CPU-bound work runs off the main thread, no jank
- **Pool support** — create N workers via the `concurrency` option with built-in queuing
- **Priority queue** — pass `priority` per-run; higher values run first with FIFO tiebreaking
- **Timeout support** — pool-level or per-run `timeout` rejects with `FamiliarTimeoutError`
- **Heartbeat monitoring** — `heartbeatWindow` kills tasks that stop responding, with auto-heartbeats for inline workers
- **AbortSignal** — cancel queued tasks with the standard `AbortController` API
- **Streaming** — `runStream()` for tasks that yield multiple partial results
- **Batch** — `batch()` runs inputs through the pool and yields results ordered or as-completed
- **Task groups** — `group()` ties related tasks to a shared abort and drain lifecycle
- **Transferables** — move large buffers to the Worker without a structured-clone copy
- **Prime** — pre-initialize worker slots to eliminate first-task latency
- **Metrics** — `active`, `queued`, `completed`, `failed`, `groupCount` counters for observability
- **Typed error hierarchy** — `FamiliarTimeoutError`, `FamiliarTaskError`, `FamiliarQueueFullError`, and more
- **`[Symbol.dispose]`** — `using` keyword support (ES2025 explicit resource management)
- **Module workers** — `createModuleWorker` loads a real `.js/.ts` module file as the Worker
- **Testing utilities** — `createTestWorker` runs tasks in-process with call recording
- **Zero dependencies** — no supply chain risk, minimal bundle size

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Arsenal](/arsenal/) — utility functions useful inside self-contained task functions
- [Ripple](/ripple/) — pair with reactive signals to drive UI from worker pool metrics
- [Herald](/herald/) — emit typed events from worker task functions back to the main thread

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
