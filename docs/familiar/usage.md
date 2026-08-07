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

Pass one signal to stop capacity waits, queued work, or active work. Cancelling active work terminates and lazily replaces its slot.

```ts
const controller = new AbortController();
const result = pool.run('input', { signal: controller.signal, timeout: 500 });

controller.abort();
await result.catch((error) => console.log(error.name)); // AbortError
```

## Queue Policy and Priority

Use `maxQueue` to bound waiting work. Higher priorities dispatch first once a slot opens.

```ts
const pool = createWorker<Job, Result>(new URL('./job.worker.ts', import.meta.url), {
  concurrency: 2,
  maxQueue: 100,
  onFull: 'wait',
});

await pool.run(criticalJob, { priority: 10 });
```

## Batch and Groups

Compose task pools with free helpers instead of carrying unrelated methods on every pool.

```ts
import { batch, createTaskGroup } from '@vielzeug/familiar';

for await (const value of batch(pool, inputs)) {
  console.log(value);
}

const group = createTaskGroup(pool, 'import');
const tasks = rows.map((row) => group.run(row));
await group.drain();
await Promise.all(tasks);
```

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

## Testing

Use `createTestWorker()` when testing consumer code that depends on a task pool. It clones input/output, wraps task failures, and honors cancellation and timeout behavior.

```ts
import { createTestWorker } from '@vielzeug/familiar/testing';

const pool = createTestWorker((value: number) => value * 2);
await expect(pool.run(21)).resolves.toBe(42);
expect(pool.calls).toEqual([{ input: 21, status: 'fulfilled', value: 42 }]);
pool.dispose();
```

Test worker-module business logic directly when possible. `createTestWorker()` does not run module files or support stream pools.

## Framework Integration

Create a pool once per component lifetime. Abort obsolete requests during effect cleanup and dispose the pool on unmount.

::: code-group

```tsx [React]
import { useEffect, useMemo } from 'react';
import { createWorker } from '@vielzeug/familiar';

const pool = useMemo(() => createWorker(new URL('./sort.worker.ts', import.meta.url)), []);

useEffect(() => () => pool.dispose(), [pool]);
```

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

Use `@vielzeug/arsenal` async helpers in application orchestration. Keep worker module protocol registration in `@vielzeug/familiar/protocol`.

## Best Practices

- Put every task handler in its own module-worker boundary.
- Reuse pools for repeated work; dispose owner-scoped pools.
- Abort work made obsolete by navigation or newer input.
- Transfer large binary buffers instead of cloning them.
- Set explicit timeouts for work with a bounded latency budget.
- Keep worker handlers deterministic and data-only.
- Test module logic directly; test pool consumers with `createTestWorker()`.
