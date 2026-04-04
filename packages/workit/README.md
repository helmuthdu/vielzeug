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
- ✅ Configurable pooling via `concurrency`
- ✅ Task timeouts with worker recycling
- ✅ Queued-task cancellation via `AbortSignal`
- ✅ Transferables support
- ✅ `WorkerError` hierarchy for library failures
- ✅ `createTestWorker` for in-process tests
- ✅ `[Symbol.dispose]` support
- ✅ Zero dependencies

## Runtime Model

- `createWorker()` is safe to call in any runtime.
- `run()` requires a real Worker implementation and rejects with `WorkerError` when the Worker API is unavailable.
- Task functions are serialized with `.toString()` and must be self-contained.

## API

```ts
import { createWorker, TaskError, TaskTimeoutError, TerminatedError, WorkerError } from '@vielzeug/workit';
import type { RunOptions, TaskFn, WorkerHandle, WorkerOptions, WorkerStatus } from '@vielzeug/workit';

type WorkerOptions = {
  concurrency?: number | 'auto';
  timeout?: number;
};

type WorkerHandle<TInput, TOutput> = {
  run(input: TInput, options?: RunOptions): Promise<TOutput>;
  dispose(): void;
  readonly concurrency: number;
  readonly status: WorkerStatus;
  [Symbol.dispose](): void;
};
```

## Testing

```ts
import { createTestWorker } from '@vielzeug/workit/test';

const worker = createTestWorker<number, number>((n) => n * 3);

await worker.run(7);
console.log(worker.calls); // [{ input: 7, output: 21 }]
worker.dispose();
```

## Documentation

| Resource | Focus |
| --- | --- |
| [Usage Guide](https://vielzeug.dev/workit/usage) | Task functions, pooling, timeouts, cancellation |
| [API Reference](https://vielzeug.dev/workit/api) | Full types and error semantics |
| [Examples](https://vielzeug.dev/workit/examples) | Transferables, image processing, React integration |

## License

MIT © [Vielzeug](https://github.com/helmuthdu/vielzeug)
