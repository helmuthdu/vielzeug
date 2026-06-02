---
title: Familiar — Usage Guide
description: How to use familiar for task functions, single workers, pools, streaming, priorities, heartbeat, timeouts, cancellation, typed errors, and testing.
---

[[toc]]

::: tip
New to Worker? Start with the [Overview](./index.md) for a quick introduction.
:::

## Task Functions

A task function receives a single typed input and returns a value (synchronously or as a Promise). Because the function is serialized via `.toString()` and executed in a separate global scope, it **must be entirely self-contained** — it cannot close over variables from the surrounding module.

```ts
import { createWorker } from '@vielzeug/familiar';
import type { TaskFn } from '@vielzeug/familiar';

// Inline function — keeps everything self-contained
const worker = createWorker<number, number>((n) => n * 2);

// Named function reference — also fine
function double(n: number): number {
  return n * 2;
}
const worker2 = createWorker<number, number>(double);

// Type alias for reuse
type Fn = TaskFn<{ a: number; b: number }, number>;
const add: Fn = ({ a, b }) => a + b;
const addWorker = createWorker(add);
```

::: warning Self-contained closures
The task function runs inside a Web Worker with a separate global scope. Any outer-scope variable you reference will be `undefined` at runtime. Put helpers inside the task function or encode them into the input payload.
:::

## Single Worker

Calling `createWorker` without a `concurrency` option creates a single worker that processes one task at a time. Additional calls to `run()` are queued and dispatched in order.

```ts
import { createWorker } from '@vielzeug/familiar';

const worker = createWorker<string, string>((text) => text.toUpperCase());

console.log(await worker.run('hello')); // 'HELLO'
console.log(await worker.run('world')); // 'WORLD'

worker.dispose();
```

## Worker Pool

Pass `concurrency` to spin up multiple worker slots. Tasks are dispatched to the first idle slot; if all slots are busy the task is queued.

```ts
import { createWorker } from '@vielzeug/familiar';

// Fixed pool of 4
const pool = createWorker<number, number>(
  (n) => {
    function fib(x: number): number {
      return x <= 1 ? x : fib(x - 1) + fib(x - 2);
    }
    return fib(n);
  },
  { concurrency: 4 },
);

// Automatically uses all 4 slots in parallel
const results = await Promise.all([30, 31, 32, 33].map((n) => pool.run(n)));

pool.dispose();

// 'auto' — uses navigator.hardwareConcurrency when available
const autoPool = createWorker<number, number>((n) => n ** 2, { concurrency: 'auto' });
```

## Queue Back-Pressure (`maxQueue`)

Set `maxQueue` to cap how many tasks can wait in the queue. When the queue is full and `onFull` is `'reject'` (the default), `run()` rejects immediately with `WorkerQueueFullError`:

```ts
import { createWorker, WorkerQueueFullError } from '@vielzeug/familiar';

const worker = createWorker<number, number>((n) => n * 2, {
  concurrency: 1,
  maxQueue: 100,
});

try {
  await worker.run(1);
} catch (error) {
  if (error instanceof WorkerQueueFullError) {
    console.error(`Back-pressure triggered: queue is full (max ${error.maxQueue})`);
  }
}
```

For producer→consumer pipelines, use `onFull: 'wait'` to suspend the caller instead. See [Queue Back-Pressure (`onFull`)](#queue-back-pressure-onfull) below.

## Timeouts

Set `timeout` (in milliseconds) to automatically reject tasks that run too long. A `WorkerError` with code `'timeout'` is thrown.

```ts
import { createWorker, WorkerError } from '@vielzeug/familiar';

const worker = createWorker<number, number>((ms) => new Promise((resolve) => setTimeout(() => resolve(ms), ms)), {
  timeout: 1000,
});

try {
  await worker.run(5000); // will reject after 1 s
} catch (err) {
  if (err instanceof WorkerError && err.code === 'timeout') {
    console.error('Task timed out');
  }
}

worker.dispose();
```

## AbortSignal

Pass an `AbortSignal` via `RunOptions` to cancel a **queued** task before it starts. Tasks already in flight cannot be interrupted.

```ts
import { createWorker } from '@vielzeug/familiar';

const worker = createWorker<string, string>((text) => text.toUpperCase(), { concurrency: 1 });

const ac = new AbortController();

// Queue multiple tasks
const p1 = worker.run('first');
const p2 = worker.run('second', { signal: ac.signal });
const p3 = worker.run('third', { signal: ac.signal });

// Cancel the queued tasks
ac.abort(); // p2 and p3 reject with DOMException (AbortError)

await p1; // still resolves — it was already in flight
worker.dispose();
```

## Transferables

Large `ArrayBuffer`, `MessagePort`, or `OffscreenCanvas` values can be moved to the Worker thread instead of copied. This avoids the structured-clone overhead on large payloads.

```ts
import { createWorker } from '@vielzeug/familiar';

type ImageTask = { pixels: Uint8ClampedArray; width: number; height: number };
type ImageResult = { pixels: Uint8ClampedArray };

const worker = createWorker<ImageTask, ImageResult>(({ pixels }) => {
  const out = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const g = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    out[i] = out[i + 1] = out[i + 2] = g;
    out[i + 3] = pixels[i + 3];
  }
  return { pixels: out };
});

const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

// Transfer the buffer — zero-copy move to the worker
const { pixels } = await worker.run(
  { pixels: imageData.data, width: imageData.width, height: imageData.height },
  { transferables: [imageData.data.buffer] },
);

worker.dispose();
```

::: warning
Once a buffer is transferred it is detached (length = 0) in the sending context. Do not access it after the `run()` call.
:::

## Worker Status

The `status` property reflects the current state of the worker handle:

| Value          | Meaning                                      |
| -------------- | -------------------------------------------- |
| `'idle'`       | All slots are free and waiting for tasks     |
| `'running'`    | One or more slots are executing a task       |
| `'terminated'` | `dispose()` was called — `run()` will reject |

```ts
import { createWorker } from '@vielzeug/familiar';
import type { WorkerStatus } from '@vielzeug/familiar';

const worker = createWorker<number, number>((n) => n * 2);

console.log(worker.status); // 'idle'

const p = worker.run(21);
console.log(worker.status); // 'running'

await p;
console.log(worker.status); // 'idle'

worker.dispose();
console.log(worker.status); // 'terminated'
```

## Stats

Use lightweight counters for visibility and load monitoring:

- `completed`: successful tasks since creation
- `failed`: tasks rejected with a task / timeout / worker error (aborts and terminations excluded)
- `active`: number of slots currently executing a task
- `queued`: tasks currently waiting in the queue
- `utilization`: active slot ratio from `0` to `1`

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number, number>((n) => n + 1, { concurrency: 4 });

console.log(pool.completed);   // 0
console.log(pool.failed);      // 0
console.log(pool.utilization); // 0
console.log(pool.active);      // 0
console.log(pool.queued);      // 0

await pool.run(1);
await pool.run(-1).catch(() => {});   // throws inside worker
console.log(pool.completed);   // 1
console.log(pool.failed);      // 1
```

## Batch Processing (`batch`)

Use `batch()` to run a list of inputs through the pool and consume results as they arrive, in submission order:

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number, number>(
  (n) => {
    function fib(x: number): number {
      return x <= 1 ? x : fib(x - 1) + fib(x - 2);
    }
    return fib(n);
  },
  { concurrency: 4 },
);

for await (const result of pool.batch([30, 31, 32, 33])) {
  console.log(result); // printed in submission order as each task finishes
}

pool.dispose();
```

`batch()` accepts the same per-run options as `run()` (except `signal`, which is managed internally):

```ts
// Apply a 500ms timeout to every task in the batch
for await (const result of pool.batch([1, 2, 3], { timeout: 500 })) {
  console.log(result);
}
```

If any task throws, `batch()` cancels remaining queued tasks and re-throws the error.

Pass `ordered: false` to yield results in completion order instead of submission order (higher throughput when tasks take different amounts of time):

```ts
for await (const result of pool.batch([1, 2, 3], { ordered: false })) {
  console.log(result); // arrives as soon as each task finishes
}
```

## Streaming (`runStream`)

When a task yields multiple partial results, use `runStream()`. The task function must return an async iterable; each yielded value is forwarded to the caller as a chunk.

::: warning Requires a free slot
`runStream()` cannot queue. If all slots are busy it throws `WorkerRuntimeError` immediately. Design streaming workloads so slots are available or use `run()` for queueable alternatives.
:::

```ts
import { createWorker } from '@vielzeug/familiar';

// Task returns an async iterable
const worker = createWorker<{ start: number; end: number }, number[]>(
  ({ start, end }) =>
    (async function* () {
      for (let i = start; i <= end; i++) {
        await new Promise((r) => setTimeout(r, 10)); // simulate work per chunk
        yield i;
      }
    })() as unknown as number[],
);

for await (const chunk of worker.runStream({ start: 1, end: 5 })) {
  console.log('chunk:', chunk); // 1, 2, 3, 4, 5
}

worker.dispose();
```

Breaking out of the loop early (or throwing from the body) releases the slot cleanly — no leak, no stale timers.

## Task Groups (`group`)

Use `group()` when you want to cancel and drain a set of related tasks together.

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number, number>((n) => n * 2, { concurrency: 4 });
const g = pool.group();

// Submit tasks into the group
const p1 = g.run(1);
const p2 = g.run(2);
const p3 = g.run(3);

// Wait for all group tasks to settle (success or failure)
await g.drain();

console.log(g.size); // 3

pool.dispose();
```

Cancel all pending tasks in the group with `g.abort()`:

```ts
const g = pool.group();

const p1 = g.run(slowTask1);
const p2 = g.run(slowTask2);
const p3 = g.run(slowTask3);

g.abort(); // p2, p3 (queued) reject; p1 (in-flight) completes normally
await p1;
```

`drain()` throws the first error after all tasks have settled, preventing unhandled rejections from subsequent failures:

```ts
const g = pool.group();

g.run(failingTask1).catch(() => {}); // handle individually
g.run(failingTask2).catch(() => {}); // handle individually

const err = await g.drain().catch((e) => e);
// err is the first failure — both tasks settled before throw
```

## Priority Queue

Pass `priority` per `run()` call. Higher values run before lower values when tasks queue up. Equal priorities are FIFO.

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<string, string>((s) => s.toUpperCase(), { concurrency: 1 });

// Queue multiple tasks — the slot is busy with a blocker
const blocker = pool.run('low-priority-blocker');

pool.run('low', { priority: 1 });
pool.run('critical', { priority: 100 }); // runs first once blocker finishes
pool.run('normal', { priority: 10 });

// Execution order after blocker: critical → normal → low
```

Default priority is `0`.

## Per-Run Timeout

The `timeout` option can also be passed per `run()` call, overriding the pool-level timeout for that specific task:

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<string, string>((s) => s.toUpperCase(), {
  timeout: 5000, // default: 5 s
});

// This specific task must complete in 100ms
await pool.run('hello', { timeout: 100 });
```

## Graceful Shutdown (`close`)

Use `close()` to finish queued/in-flight work before terminating workers:

```ts
import { createWorker } from '@vielzeug/familiar';

const worker = createWorker<number, number>((n) => n * 2, { concurrency: 1 });

const p1 = worker.run(1);
const p2 = worker.run(2);

await worker.close();

await p1;
await p2;
console.log(worker.status); // 'terminated'
```

Pass a timeout to prevent indefinite hangs — if the pool hasn't drained within that window, `close()` rejects with `WorkerError` code `'timeout'` and force-terminates:

```ts
try {
  await worker.close(5000); // must drain within 5 s
} catch (err) {
  // timed out — worker is now force-terminated
}
```

Use `dispose()` for immediate forceful termination.

## Heartbeat Monitoring

Use `heartbeatTimeout` to kill tasks that stop responding (e.g., blocked CPU work in a module worker). If the worker does not send a heartbeat within `heartbeatTimeout` ms, the task is rejected with `WorkerTimeoutError`.

**Inline workers** (`createWorker`) send heartbeats automatically at `heartbeatTimeout / 2` intervals, so long-running tasks stay alive as long as they progress:

```ts
import { createWorker } from '@vielzeug/familiar';

const worker = createWorker<void, void>(() => new Promise((r) => setTimeout(r, 5000)));

// 60s watchdog — auto-heartbeats keep it alive throughout
await worker.run(undefined, { heartbeatTimeout: 60_000 });
worker.dispose();
```

**Module workers** (`createModuleWorker`) must send heartbeats manually at the interval specified in `event.data.heartbeatInterval`:

```ts
// my-worker.ts
self.onmessage = async (event) => {
  const { id, input, heartbeatInterval } = event.data;

  // Send heartbeats at the requested interval
  const hb = heartbeatInterval
    ? setInterval(() => self.postMessage({ id, heartbeat: true }), heartbeatInterval)
    : null;

  try {
    self.postMessage({ id, result: await heavyWork(input) });
  } finally {
    if (hb) clearInterval(hb);
  }
};
```

## Slot Error Handling (`onSlotError`)

Use `onSlotError` to be notified when a Worker slot crashes with an unhandled runtime error. The slot is stopped automatically; call `restart()` to pre-warm a replacement Worker.

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number, number>((n) => n * 2, {
  concurrency: 4,
  onSlotError: (error, restart) => {
    console.error('Worker slot crashed:', error.message);
    // Optionally pre-warm the replacement Worker immediately
    restart();
  },
});
```

If `onSlotError` is omitted, errors are handled silently and the slot restarts lazily on the next `run()` call.

## Queue Back-Pressure (`onFull`)

By default, `run()` rejects with `WorkerQueueFullError` when `maxQueue` is reached (`onFull: 'reject'`). Set `onFull: 'wait'` to suspend the caller instead — natural backpressure for producer→consumer pipelines:

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number, number>((n) => n * 2, {
  concurrency: 2,
  maxQueue: 10,
  onFull: 'wait', // callers suspend until a queue slot opens
});

// Producer — never rejects with queue_full
for (let i = 0; i < 1000; i++) {
  await pool.run(i); // suspends automatically when queue is full
}

await pool.close();
```

## Module Workers (`createModuleWorker`)

Use `createModuleWorker` when the task needs imports, top-level await, or module-scope helpers that cannot be inlined into a self-contained function.

```ts
// my-worker.ts — a regular ES module
import { heavyLib } from './heavy-lib.js';

self.onmessage = async (event) => {
  const { id, input } = event.data;
  try {
    self.postMessage({ id, result: await heavyLib.process(input) });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    self.postMessage({ id, error: { name: err.name, message: err.message, stack: err.stack } });
  }
};

// main.ts
import { createModuleWorker } from '@vielzeug/familiar';

const pool = createModuleWorker<string, string>(
  new URL('./my-worker.ts', import.meta.url),
  { concurrency: 4 },
);

const result = await pool.run('hello');
pool.dispose();
```

See the [API Reference](./api.md#createmoduleworker) for the full message protocol schema.

## Typed Errors

Each failure reason has its own class with extra fields for context. Use `instanceof` checks for precise handling:

```ts
import {
  createWorker,
  WorkerQueueFullError,
  WorkerTaskError,
  WorkerTerminatedError,
  WorkerTimeoutError,
} from '@vielzeug/familiar';

const pool = createWorker<number, number>((n) => {
  if (n < 0) throw new RangeError('negative input');
  return n * 2;
}, { concurrency: 1, maxQueue: 5, timeout: 1000 });

try {
  await pool.run(input);
} catch (err) {
  if (err instanceof WorkerTimeoutError) {
    // .timeoutMs tells you exactly how long it waited
    console.error(`Timed out after ${err.timeoutMs}ms`);
  } else if (err instanceof WorkerTaskError) {
    // .cause is the original error thrown inside the task
    console.error('Task threw:', (err.cause as Error).message);
  } else if (err instanceof WorkerQueueFullError) {
    // .maxQueue is the configured limit
    console.error(`Queue full (max ${err.maxQueue} tasks)`);
  } else if (err instanceof WorkerTerminatedError) {
    console.error('Pool was disposed');
  }
}
```

All error subclasses extend `WorkerError` — use `instanceof WorkerError` as a catch-all:

```ts
import { WorkerError } from '@vielzeug/familiar';

try {
  await pool.run(input);
} catch (err) {
  if (err instanceof WorkerError) {
    // err.code is always set: 'timeout' | 'task' | 'queue_full' | 'terminated' | 'worker' | 'invalid_options'
    console.error(`Worker error [${err.code}]:`, err.message);
  }
}
```

## Runtime Availability

`createWorker()` is safe to call in any runtime. Actual execution happens only when you call `run()`, and that requires a real Worker implementation.

```ts
import { createWorker, WorkerError } from '@vielzeug/familiar';

const worker = createWorker<number, number>((n) => n * 2);

try {
  console.log(await worker.run(21));
} catch (error) {
  if (error instanceof WorkerError) {
    console.error('Worker execution is unavailable in this runtime');
  }
}
```

This keeps construction cheap and predictable in shared modules, while still failing clearly when the runtime cannot execute Workers.

## `Symbol.dispose` / `using` Declarations

`WorkerHandle` implements `[Symbol.dispose]` as an alias for `dispose()`, enabling the TC39 [explicit resource management](https://github.com/tc39/proposal-explicit-resource-management) `using` keyword (TypeScript ≥ 5.2 with `"lib": ["es2025"]`):

```ts
import { createWorker } from '@vielzeug/familiar';

{
  using worker = createWorker<number, number>((n) => n * 2);
  const result = await worker.run(21); // 42
} // worker.dispose() is called automatically here
```

This also works with worker pools:

```ts
{
  using pool = createWorker<string, string>((text) => text.toUpperCase(), { concurrency: 4 });
  const results = await Promise.all(['hello', 'world'].map((s) => pool.run(s)));
  // ['HELLO', 'WORLD']
} // all 4 slots terminated automatically
```

`createTestWorker` supports `[Symbol.dispose]` as well:

```ts
import { createTestWorker } from '@vielzeug/familiar/testing';

{
  using worker = createTestWorker<number, number>((n) => n * 3);
  const result = await worker.run(7); // 21
} // disposed automatically
```

## Testing

Use `createTestWorker` from the `/test` subpath to run tasks in-process with call recording. Workers never spawn, so tests run in any environment (Node, jsdom, etc.) without additional setup.

```ts
import { createTestWorker } from '@vielzeug/familiar/testing';
import { describe, expect, it } from 'vitest';

type Input = { a: number; b: number };
type Output = number;

describe('add worker', () => {
  it('returns the sum', async () => {
    const worker = createTestWorker<Input, Output>(({ a, b }) => a + b);

    expect(await worker.run({ a: 2, b: 3 })).toBe(5);
    expect(await worker.run({ a: 10, b: 20 })).toBe(30);

    // Inspect recorded calls
    expect(worker.calls).toHaveLength(2);
    expect(worker.calls[0]!.input).toEqual({ a: 2, b: 3 });
    expect(worker.calls[1]!.output).toBe(30);

    worker.dispose();
  });
});
```

`TestWorkerHandle` also supports `[Symbol.dispose]`:

```ts
{
  using worker = createTestWorker<number, number>((n) => n * 2);
  const result = await worker.run(21); // 42
}
```

### `TestWorkerOptions`

```ts
type TestWorkerOptions = {
  concurrency?: number;  // default: 1
  maxQueue?: number;
  onFull?: 'reject' | 'wait';
};
```

The default `concurrency: 1` gives deterministic serial execution. Increase it only when testing concurrency-specific behavior:

```ts
// Test that 3 tasks run truly in parallel
const worker = createTestWorker<number, number>(
  (n) => new Promise((r) => setTimeout(() => r(n), 20)),
  { concurrency: 3 },
);

const start = Date.now();
const results = await Promise.all([worker.run(1), worker.run(2), worker.run(3)]);
console.log(Date.now() - start); // ~20ms — ran in parallel
```

## Prime (Pre-initialize)

Call `prime()` after creating a pool to pre-spawn all Worker threads and eliminate cold-start latency on the first task.

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number, number>((n) => n * 2, { concurrency: 4 });

// Pre-spawn during app init and await readiness
await pool.prime();

// First run() has no cold-start overhead
const result = await pool.run(21); // 42

pool.dispose();
```

Prime is best-effort. If the Worker API is unavailable (SSR, Node.js without Worker support), it silently does nothing and the error surfaces on the first `run()` call instead.

## Framework Integration

Worker handles are plain objects — wrap them in a hook or composable to integrate with your framework's lifecycle.

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createWorker, type WorkerHandle } from '@vielzeug/familiar';
import type { TaskFn } from '@vielzeug/familiar';

function useWorker<TInput, TOutput>(fn: TaskFn<TInput, TOutput>, concurrency = 2) {
  const ref = useRef<WorkerHandle<TInput, TOutput> | null>(null);

  useEffect(() => {
    const worker = createWorker(fn, { concurrency });
    void worker.prime();
    ref.current = worker;
    return () => { worker.close(); };
  }, []);

  return ref;
}

function ImageProcessor() {
  const workerRef = useWorker((buf: ArrayBuffer) => buf.byteLength, 4);

  async function handleUpload(file: File) {
    const buf = await file.arrayBuffer();
    const size = await workerRef.current!.run(buf);
    console.log('Processed', size, 'bytes');
  }

  return <button onClick={() => handleUpload(selectedFile)}>Process</button>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createWorker } from '@vielzeug/familiar';
import { onScopeDispose, ref } from 'vue';

const pool = createWorker((n: number) => n * n, { concurrency: 2 });
void pool.prime();
onScopeDispose(() => pool.close());

const result = ref<number | null>(null);

async function runTask(n: number) {
  result.value = await pool.run(n);
}
</script>

<template>
  <button @click="runTask(9)">Square</button>
  <p>{{ result }}</p>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createWorker } from '@vielzeug/familiar';
  import { onDestroy } from 'svelte';

  const pool = createWorker((n: number) => n * n, { concurrency: 2 });
  void pool.prime();
  onDestroy(() => pool.close());

  let result: number | null = null;

  async function runTask() {
    result = await pool.run(9);
  }
</script>

<button on:click={runTask}>Square</button>
<p>{result}</p>
```

:::

### Pitfalls

- **React:** Initializing the pool with `createWorker(fn, ...)` directly in the component body (not inside `useEffect` or `useRef`) creates a new pool on every render. Always use `useRef` for stable initialization.
- **Vue 3:** Creating the pool inside a `watch` or `computed` callback instead of at the top level of `setup()` can result in multiple pools being created. Always create at the top level and register `onScopeDispose` immediately.
- **Svelte:** The pool created at the top of `<script>` starts immediately — if the component is conditionally rendered with `{#if}`, the pool is created when the component mounts. This is correct. Ensure `onDestroy` is called to close it when the component is removed.

## Working with Other Vielzeug Libraries

### With Herald

Emit progress events from a worker task and consume them on the main thread.

```ts
import { createWorker } from '@vielzeug/familiar';
import { createBus } from '@vielzeug/herald';

const bus = createBus<{ progress: number }>();
bus.on('progress', (pct) => console.log(`${pct}%`));

const worker = createWorker(async (items: string[]) => {
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]!);
    bus.emit('progress', Math.round((i / items.length) * 100));
  }
  return items.length;
});
```

### With Ripple

Track worker pool status in a reactive signal to drive UI state.

```ts
import { createWorker } from '@vielzeug/familiar';
import { computed, signal } from '@vielzeug/ripple';

const pool = createWorker((n: number) => n * 2, { concurrency: 4 });
const active = signal(pool.active);
const queued = signal(pool.queued);

const isBusy = computed(() => active() > 0);

async function runTask(input: number) {
  active.set(pool.active);
  const result = await pool.run(input);
  active.set(pool.active);
  queued.set(pool.queued);
  return result;
}
```

## Best Practices

- Use `concurrency` > 1 for CPU-bound tasks — multiple slots prevent head-of-line blocking.
- Set `maxQueue` to bound memory usage when consumers are slower than producers.
- Pass large binary data (images, audio, WASM buffers) as `Transferable` to avoid copying.
- Use `AbortSignal` to cancel queued tasks when the user navigates away.
- Call `await pool.prime()` at startup when you know tasks will arrive soon, to eliminate first-task cold-start latency.
- Always call `close()` in framework cleanup callbacks to terminate worker threads and free resources.
- Keep worker task functions pure and self-contained — avoid closures over mutable main-thread state.
- Use `createTestWorker()` in unit tests to run tasks in-process without spinning up real Worker threads.
