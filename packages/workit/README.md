# @vielzeug/workit

> Type-safe Web Worker abstraction with task queuing, pooling, and timeouts

[![npm version](https://img.shields.io/npm/v/@vielzeug/workit)](https://www.npmjs.com/package/@vielzeug/workit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Workit** wraps Web Workers in a small, fully typed async API. Define a task function once and workit handles worker creation, queuing, timeouts, queued-task cancellation, and pooling.

## Installation

```sh
pnpm add @vielzeug/workit
# npm install @vielzeug/workit
# yarn add @vielzeug/workit
```

## Quick Start

```ts
import { createWorker } from '@vielzeug/workit';

const worker = createWorker<number[], number>((nums) => nums.reduce((sum, value) => sum + value, 0));

console.log(await worker.run([1, 2, 3, 4, 5])); // 15
worker.dispose();

const pool = createWorker<number, number>(
  function fib(n): number {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
  },
  { concurrency: 4, timeout: 5000 },
);

const results = await Promise.all([35, 36, 37, 38].map((n) => pool.run(n)));
pool.dispose();
```

## Features

- ✅ Fully typed inputs and outputs
- ✅ Web Worker backed execution for CPU-heavy tasks
- ✅ Configurable worker pooling via `concurrency`
- ✅ Bounded queue via `maxQueue` with backpressure rejection
- ✅ Task timeouts with automatic worker recycling
- ✅ Queued-task cancellation via `AbortSignal`
- ✅ Zero-copy transferables support
- ✅ Graceful shutdown via `close()`
- ✅ Typed `WorkerError` with `.code` discriminant
- ✅ `createTestWorker` helper for in-process testing
- ✅ `[Symbol.dispose]` and `[Symbol.asyncDispose]` support
- ✅ Zero dependencies

## Runtime Model

- `createWorker()` is safe to call in any runtime.
- `run()` requires a real Worker implementation and rejects with `WorkerError` when the Worker API is unavailable.
- Task functions are serialized with `.toString()` and must be self-contained — they cannot close over variables from the surrounding module.

## API

```ts
import { createWorker, WorkerError } from '@vielzeug/workit';
import type { RunOptions, TaskFn, WorkerErrorCode, WorkerHandle, WorkerOptions, WorkerStatus } from '@vielzeug/workit';

type WorkerOptions = {
  concurrency?: number | 'auto'; // Default: 1. 'auto' uses navigator.hardwareConcurrency.
  maxQueue?: number | 'auto';    // Default: unbounded. 'auto' is concurrency * 2.
  timeout?: number;              // Milliseconds. Must be > 0.
};

type RunOptions = {
  signal?: AbortSignal;          // Cancels a queued task; in-flight tasks cannot be cancelled.
  transferables?: Transferable[]; // Transferred to the worker thread (zero-copy).
};

type WorkerHandle<TInput, TOutput> = {
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  close(): Promise<void>;         // Drain then terminate.
  dispose(): void;                // Terminate immediately.
  readonly completed: number;     // Successfully completed task count.
  readonly concurrency: number;   // Number of worker slots.
  readonly size: number;          // Queued task count.
  readonly status: WorkerStatus;  // 'idle' | 'running' | 'terminated'
  readonly utilization: number;   // Active slots / total slots (0–1).
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
};

// All library errors. Discriminate on `.code`.
type WorkerErrorCode = 'invalid_options' | 'queue_full' | 'task' | 'terminated' | 'timeout' | 'worker';
class WorkerError extends Error {
  readonly code: WorkerErrorCode;
}
```

### Error handling

All errors thrown by workit are `WorkerError` instances. Use `.code` to discriminate:

```ts
try {
  await worker.run(input);
} catch (err) {
  if (err instanceof WorkerError) {
    switch (err.code) {
      case 'task':      /* the task function threw */ break;
      case 'timeout':   /* task exceeded timeout */   break;
      case 'terminated':/* pool was disposed */       break;
      case 'queue_full':/* maxQueue reached */        break;
      case 'worker':    /* worker-level failure */    break;
    }
  }
}
```

For `code: 'task'`, the original error is preserved as `err.cause`.

## Testing

`createTestWorker` runs the task function in-process, so no real Workers are required. It implements the full `WorkerHandle` contract including queuing, `close()`, `AbortSignal` cancellation, and `maxQueue`. Transferable semantics are not emulated (no structured-clone boundary), which is expected for in-process execution.

```ts
import { createTestWorker } from '@vielzeug/workit/test';
import type { TestWorkerHandle, TestWorkerOptions } from '@vielzeug/workit/test';

const worker = createTestWorker<number, number>((n) => n * 3, { maxQueue: 10 });

await worker.run(7);
console.log(worker.calls); // [{ input: 7, output: 21 }]
await worker.close();
```

## Documentation

| Resource | Focus |
| --- | --- |
| [Usage Guide](https://vielzeug.dev/workit/usage) | Task functions, pooling, timeouts, cancellation |
| [API Reference](https://vielzeug.dev/workit/api) | Full types and error semantics |
| [Examples](https://vielzeug.dev/workit/examples) | Transferables, image processing, React integration |

## License

MIT © [Vielzeug](https://github.com/helmuthdu/vielzeug)
