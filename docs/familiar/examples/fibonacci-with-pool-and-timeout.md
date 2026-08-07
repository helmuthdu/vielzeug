---
title: Fibonacci With Pool And Timeout
description: Bound CPU work with a module-worker timeout.
---

## Fibonacci With Pool And Timeout

### Problem

Expensive recursive computation needs a latency limit.

### Solution

Put recursion in worker module and configure task timeout.

```ts
// fib.worker.ts
import { exposeTask } from '@vielzeug/familiar/protocol';

function fib(value: number): number {
  return value <= 1 ? value : fib(value - 1) + fib(value - 2);
}

exposeTask(fib);
```

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number, number>(new URL('./fib.worker.ts', import.meta.url), { concurrency: 4, timeout: 5_000 });

try {
  const result = await pool.run(35);
  console.log(result);
} finally {
  pool.dispose();
}
```

### Pitfalls

- Timeout terminates worker slot and rejects with `FamiliarTimeoutError`.
- Set deadline from expected input limits.

### Related

- [Typed Error Handling](./typed-error-handling.md)
