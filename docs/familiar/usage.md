---
title: Familiar — Usage Guide
description: Run task and stream module workers with bounded concurrency, cancellation, and test parity.
---

[[toc]]

## Basic Usage

Put task logic in a worker module. Imports and helpers stay normal module code.

```ts
// normalize.worker.ts
import { exposeTask } from '@vielzeug/familiar/protocol';

import { normalize } from './normalize';

exposeTask((text: string) => normalize(text));
```

Create one long-lived pool at its owner boundary.

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<string, string>(new URL('./normalize.worker.ts', import.meta.url), {
  concurrency: 2,
  timeout: 2_000,
});

try {
  const normalized = await pool.run('  Familiar  ');
  console.log(normalized);
} finally {
  pool.dispose();
}
```

## Cancellation and Timeouts

Pass one signal to stop capacity waits, queued work, or active work. Cancelling active work terminates and lazily replaces its slot without incrementing `stats.failed`, regardless of the abort reason. Timeouts must be integer milliseconds from 1 through 2,147,483,647.

```ts
const controller = new AbortController();
const result = pool.run('input', { signal: controller.signal, timeout: 500 });

controller.abort();
await result.catch((error) => console.log(error.name)); // AbortError
```

## Queue Policy and Priority

Use `maxQueue` to bound the admitted queue. Higher priorities dispatch first once a slot opens.

```ts
const pool = createWorker<Job, Result>(new URL('./job.worker.ts', import.meta.url), {
  concurrency: 2,
  maxQueue: 100,
  onFull: 'wait',
});

await pool.run(criticalJob, { priority: 10 });
```

With `onFull: 'wait'`, overflow calls wait for admission outside the bounded queue. `stats.queued` includes both admitted tasks and capacity waiters, and priority applies to both.

## Batch Composition

Use `runBatch()` for ordered progressive results with one shared cancellation lifetime. It starts pool work concurrently, cancels siblings on the first failure, and cancels unfinished work when iteration stops early.

```ts
import { runBatch } from '@vielzeug/familiar';

for await (const result of runBatch(pool, inputs, { signal, timeout: 5_000 })) {
  consume(result);
}
```

Use `getTransferables(input, index)` when each task needs its own transfer list. See [Cancellable Batch](./examples/cancellable-batch.md).

## Streaming

Stream workers have their own capability and registration helper.

```ts
// tokenize.worker.ts
import { exposeStream } from '@vielzeug/familiar/protocol';

exposeStream(async function* (text: string) {
  for (const token of text.split(/\s+/)) yield token;
});
```

```ts
import { createStreamWorker } from '@vielzeug/familiar';

const pool = createStreamWorker<string, string>(new URL('./tokenize.worker.ts', import.meta.url));
for await (const token of pool.runStream('typed module workers')) {
  console.log(token);
}
pool.dispose();
```

Each value returned by `runStream()` is one-shot once an iterator operation begins. Unused iterators can be discarded, and `return()` immediately cancels a pending chunk request. Abort listeners are attached when iteration begins and removed when it settles. Worker messages do not provide backpressure, so keep chunks and production rates bounded when consumers may be slow.

## Testing

Use `createTestWorker()` when testing consumer code that depends on a task pool. It clones input/output, wraps task failures, and honors cancellation and timeout behavior.

```ts
import { createTestWorker } from '@vielzeug/familiar/testing';

const pool = createTestWorker((value: number) => value * 2);
await expect(pool.run(21)).resolves.toBe(42);
expect(pool.calls).toEqual([{ input: 21, status: 'fulfilled', value: 42 }]);
pool.dispose();
```

Test worker-module business logic directly when possible. `createTestWorker()` does not run module files or support stream pools. Cancellation rejects an active test task but cannot stop side effects in an already-running in-process handler.

## Framework Integration

Create a pool at a stable owner boundary. Abort obsolete requests during component cleanup and dispose the pool at the same boundary that created it.

::: code-group

```tsx [React]
import { useEffect } from 'react';
import type { WorkerPool } from '@vielzeug/familiar';

function SortedView({ pool }: { pool: WorkerPool<Input, Output> }) {
  useEffect(() => {
    const controller = new AbortController();
    void pool.run(input, { signal: controller.signal }).then(renderOutput, (error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) reportError(error);
    });
    return () => controller.abort();
  }, [input, pool]);

  return null;
}
```

Create and dispose the injected React pool at the application boundary, outside Strict Mode effect replay.

```ts [Vue]
import { onUnmounted } from 'vue';
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker(new URL('./sort.worker.ts', import.meta.url));

onUnmounted(() => pool.dispose());
```

```ts [Svelte]
import { onDestroy } from 'svelte';
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker(new URL('./sort.worker.ts', import.meta.url));

onDestroy(() => pool.dispose());
```

:::

## Working with Other Vielzeug Libraries

Keep worker module protocol registration in `@vielzeug/familiar/protocol`.

## Best Practices

- Put every task handler in its own module-worker boundary.
- Reuse pools for repeated work; dispose owner-scoped pools.
- Abort work made obsolete by navigation or newer input.
- Transfer large binary buffers instead of cloning them.
- Treat submitted inputs as immutable until dispatch; queued inputs are structured-cloned only when a worker slot becomes available.
- Set explicit timeouts for work with a bounded latency budget.
- Keep worker handlers deterministic and data-only.
- Test module logic directly; test pool consumers with `createTestWorker()`.
