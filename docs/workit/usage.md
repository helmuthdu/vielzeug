---
title: Workit — Usage Guide
description: How to use workit for task functions, single workers, pools, maxQueue back-pressure, timeouts, AbortSignal, transferables, status, and testing.
---

[[toc]]

::: tip
New to Workit? Start with the [Overview](./index.md) for a quick introduction.
:::

## Task Functions

A task function receives a single typed input and returns a value (synchronously or as a Promise). Because the function is serialized via `.toString()` and executed in a separate global scope, it **must be entirely self-contained** — it cannot close over variables from the surrounding module.

```ts
import { createWorker } from '@vielzeug/workit';
import type { TaskFn } from '@vielzeug/workit';

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
import { createWorker } from '@vielzeug/workit';

const worker = createWorker<string, string>((text) => text.toUpperCase());

console.log(await worker.run('hello')); // 'HELLO'
console.log(await worker.run('world')); // 'WORLD'

worker.dispose();
```

## Worker Pool

Pass `concurrency` to spin up multiple worker slots. Tasks are dispatched to the first idle slot; if all slots are busy the task is queued.

```ts
import { createWorker } from '@vielzeug/workit';

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

Set `maxQueue` to cap how many tasks can wait in the queue. When the queue is full, `run()` rejects with `WorkerError` code `'queue_full'`.

```ts
import { createWorker, WorkerError } from '@vielzeug/workit';

const worker = createWorker<number, number>((n) => n * 2, {
  concurrency: 1,
  maxQueue: 100,
});

try {
  await worker.run(1);
} catch (error) {
  if (error instanceof WorkerError && error.code === 'queue_full') {
    console.error('Back-pressure triggered, queue is full');
  }
}
```

Use `maxQueue: 'auto'` to default to `concurrency * 2`.

## Timeouts

Set `timeout` (in milliseconds) to automatically reject tasks that run too long. A `WorkerError` with code `'timeout'` is thrown.

```ts
import { createWorker, WorkerError } from '@vielzeug/workit';

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
import { createWorker } from '@vielzeug/workit';

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
import { createWorker } from '@vielzeug/workit';

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
import { createWorker } from '@vielzeug/workit';
import type { WorkerStatus } from '@vielzeug/workit';

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
- `utilization`: active slot ratio from `0` to `1`
- `size`: queued task count

```ts
import { createWorker } from '@vielzeug/workit';

const pool = createWorker<number, number>((n) => n + 1, { concurrency: 4 });

console.log(pool.completed); // 0
console.log(pool.utilization); // 0
console.log(pool.size); // 0

const p = pool.run(1);
console.log(pool.utilization); // > 0 while running

await p;
console.log(pool.completed); // 1
```

## Graceful Shutdown (`close`)

Use `close()` to finish queued/in-flight work before terminating workers:

```ts
import { createWorker } from '@vielzeug/workit';

const worker = createWorker<number, number>((n) => n * 2, { concurrency: 1 });

const p1 = worker.run(1);
const p2 = worker.run(2);

await worker.close();

await p1;
await p2;
console.log(worker.status); // 'terminated'
```

Use `dispose()` for immediate forceful termination.

## Runtime Availability

`createWorker()` is safe to call in any runtime. Actual execution happens only when you call `run()`, and that requires a real Worker implementation.

```ts
import { createWorker, WorkerError } from '@vielzeug/workit';

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
import { createWorker } from '@vielzeug/workit';

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
import { createTestWorker } from '@vielzeug/workit/test';

{
  using worker = createTestWorker<number, number>((n) => n * 3);
  const result = await worker.run(7); // 21
} // disposed automatically
```

## Testing

Use `createTestWorker` from the `/test` subpath to run tasks in-process with call recording. Workers never spawn, so tests run in any environment (Node, jsdom, etc.) without additional setup.

```ts
import { createTestWorker } from '@vielzeug/workit/test';
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

## Framework Integration

Workit workers are plain async functions — wrap them in a hook or composable to integrate with your framework's lifecycle.

::: code-group

```tsx [React]
import { useEffect, useRef, useState } from 'react';
import { createWorkerPool, type WorkerPool } from '@vielzeug/workit';

function useWorkerPool<TInput, TOutput>(fn: (input: TInput) => TOutput, size = 2) {
  const poolRef = useRef<WorkerPool<TInput, TOutput> | null>(null);

  useEffect(() => {
    poolRef.current = createWorkerPool(fn, { size });
    return () => { poolRef.current?.close(); };
  }, []);

  return poolRef;
}

function ImageProcessor() {
  const poolRef = useWorkerPool((buf: ArrayBuffer) => processImage(buf), 4);
  const [result, setResult] = useState<string | null>(null);

  async function handleUpload(file: File) {
    const buf = await file.arrayBuffer();
    const output = await poolRef.current!.run(buf);
    setResult(output);
  }

  return <button onClick={() => handleUpload(selectedFile)}>Process</button>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createWorkerPool } from '@vielzeug/workit';
import { onScopeDispose, ref } from 'vue';

const pool = createWorkerPool((n: number) => n * n, { size: 2 });
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
  import { createWorkerPool } from '@vielzeug/workit';
  import { onDestroy } from 'svelte';

  const pool = createWorkerPool((n: number) => n * n, { size: 2 });
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

- **React:** Initializing the pool with `createWorkerPool(fn, ...)` directly in the component body (not inside `useEffect` or `useRef`) creates a new pool on every render. Always use `useRef` for stable initialization.
- **Vue 3:** Creating the pool inside a `watch` or `computed` callback instead of at the top level of `setup()` can result in multiple pools being created. Always create at the top level and register `onScopeDispose` immediately.
- **Svelte:** The pool created at the top of `<script>` starts immediately — if the component is conditionally rendered with `{#if}`, the pool is created when the component mounts. This is correct. Ensure `onDestroy` is called to close it when the component is removed.

## Working with Other Vielzeug Libraries

### With Eventit

Emit progress events from a worker task and consume them on the main thread.

```ts
import { createWorker } from '@vielzeug/workit';
import { createBus } from '@vielzeug/eventit';

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

### With Stateit

Track worker pool status in a reactive signal to drive UI state.

```ts
import { createWorkerPool } from '@vielzeug/workit';
import { signal, computed } from '@vielzeug/stateit';

const pool = createWorkerPool(heavyTask, { size: 4 });
const stats = signal(pool.stats());

// Refresh stats after each task
const isBusy = computed(() => stats().active > 0);

async function runTask(input: number) {
  const result = await pool.run(input);
  stats.set(pool.stats());
  return result;
}
```

## Best Practices

- Use `createWorkerPool()` rather than a single worker for CPU-bound tasks — multiple workers prevent head-of-line blocking.
- Set `maxQueue` to bound memory usage when consumers are slower than producers.
- Pass large binary data (images, audio, WASM buffers) as `Transferable` to avoid copying.
- Use `AbortSignal` to cancel long-running tasks when the user navigates away.
- Always call `close()` in framework cleanup callbacks to terminate worker threads and free resources.
- Keep worker task functions pure — avoid closures over mutable main-thread state since workers run in isolated threads.
- Use `createTestWorker()` in unit tests to run tasks synchronously without spinning up real worker threads.
