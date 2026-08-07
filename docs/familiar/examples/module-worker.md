---
title: Module Worker
description: Register a normal ES module worker with Familiar's versioned protocol.
---

## Module Worker

### Problem

Task code needs imports, helper modules, or top-level module state.

### Solution

Register one handler with `exposeTask()`, then create pool from its `new URL()` reference.

```ts
// hash.worker.ts
import { exposeTask } from '@vielzeug/familiar/protocol';

import { hash } from './hash';

exposeTask(async ({ text }: { text: string }) => hash(text));
```

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<{ text: string }, string>(new URL('./hash.worker.ts', import.meta.url), {
  concurrency: 4,
  timeout: 5_000,
});

try {
  console.log(await pool.run({ text: 'hello' }));
} finally {
  pool.dispose();
}
```

### Pitfalls

- Register exactly one handler per worker module.
- Keep worker input and output structured-cloneable.
- Use `exposeStream()` with `createStreamWorker()` for chunked output.

### Related

- [API Reference](../api.md)
- [Streaming With Stream Worker](./streaming-with-runstream.md)
