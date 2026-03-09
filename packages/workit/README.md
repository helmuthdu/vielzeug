# @vielzeug/workit

> Type-safe Web Worker abstraction with task queuing, pooling, and graceful fallback

[![npm version](https://img.shields.io/npm/v/@vielzeug/workit)](https://www.npmjs.com/package/@vielzeug/workit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Workit** wraps Web Workers in a clean, fully-typed async API. Define a task function once — workit handles worker creation, message passing, timeouts, cancellation, and pooling. Falls back to main-thread execution gracefully when Workers are unavailable (SSR, tests).

## Installation

```sh
pnpm add @vielzeug/workit
# npm install @vielzeug/workit
# yarn add @vielzeug/workit
```

## Quick Start

```typescript
import { createWorker } from '@vielzeug/workit';

// Single worker (default size: 1)
const worker = createWorker<number[], number>(
  (nums) => nums.reduce((a, b) => a + b, 0),
);
const sum = await worker.run([1, 2, 3, 4, 5]); // 15
worker.dispose();

// Worker pool — 4 concurrent workers
const pool = createWorker<number, number>(
  (n) => {
    function fib(x: number): number { return x <= 1 ? x : fib(x - 1) + fib(x - 2); }
    return fib(n);
  },
  { size: 4 },
);
const results = await Promise.all([35, 36, 37, 38].map((n) => pool.run(n)));
pool.dispose();
```

## Features

- ✅ **Type-safe** — payload types flow from `TaskFn` declaration to every `run()` call
- ✅ **Web Worker backed** — CPU-bound work runs off the main thread, no jank
- ✅ **Graceful fallback** — runs tasks on the main thread when Workers are unavailable
- ✅ **Pool support** — create N workers via the `size` option with built-in queuing
- ✅ **Timeout support** — reject tasks that exceed a configurable time limit
- ✅ **AbortSignal** — cancel queued tasks with the standard `AbortController` API
- ✅ **Transferables** — move large buffers to the Worker without copying via `transfer`
- ✅ **`isNative`** — know at runtime whether a real Worker is active or fallback is in use
- ✅ **`[Symbol.dispose]`** — `using` keyword support (ES2025 explicit resource management)
- ✅ **`WorkerError` hierarchy** — single `instanceof WorkerError` covers all error types
- ✅ **Testing utilities** — `createTestWorker` runs tasks in-process with call recording
- ✅ **Zero dependencies** — no supply chain risk, minimal bundle size

## API

### `createWorker(fn, options?)`

Single factory for both single-worker and pool use cases.

```typescript
import { createWorker } from '@vielzeug/workit';
import type { TaskFn, WorkerOptions, WorkerHandle, RunOptions } from '@vielzeug/workit';

const worker = createWorker<TInput, TOutput>(fn, {
  size?: number | 'auto', // worker slots (default: 1, 'auto' = hardwareConcurrency)
  timeout?: number,        // ms before task rejects (default: none)
  fallback?: boolean,      // allow main-thread fallback (default: true)
  scripts?: string[],      // URLs loaded via importScripts() inside the Worker
});

// WorkerHandle interface
await worker.run(input);                        // Promise<TOutput>
await worker.run(input, { signal, transfer });  // with RunOptions
worker.size;      // number of slots
worker.status;    // 'idle' | 'running' | 'terminated'
worker.isNative;  // true = real Worker, false = main-thread fallback
worker.dispose(); // reject pending tasks + terminate workers

// ES2025 explicit resource management
{
  using worker = createWorker<string, string>((s) => s.toUpperCase());
  await worker.run('hello'); // 'HELLO'
} // automatically disposed
```

### Error Classes

All errors extend `WorkerError` — a single `catch` can cover everything:

```typescript
import { WorkerError, TaskTimeoutError, TerminatedError, TaskError } from '@vielzeug/workit';

try {
  await worker.run(input);
} catch (err) {
  if (err instanceof TaskTimeoutError) { /* timeout exceeded */ }
  if (err instanceof TerminatedError)  { /* worker was disposed */ }
  if (err instanceof TaskError)        { /* task function threw */ }
  if (err instanceof WorkerError)      { /* catches all of the above */ }
}
```

### `createTestWorker(fn)` — testing subpath

Test utility that runs `fn` directly in the same thread and records all calls.

```typescript
import { createTestWorker } from '@vielzeug/workit/test';

const worker = createTestWorker<TInput, TOutput>(fn);

await worker.run(input);
worker.calls;    // ReadonlyArray<{ input: TInput; output: TOutput }>
worker.isNative; // always false
worker.dispose();
```

## Documentation

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/workit/usage) | Task functions, pools, timeouts, error handling |
| [API Reference](https://vielzeug.dev/workit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/workit/examples) | Image processing, data pipelines, React integration |

## License

MIT © [Vielzeug](https://github.com/helmuthdu/vielzeug)
