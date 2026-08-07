---
title: Streaming With Stream Worker
description: Yield module-worker chunks through a stream-only pool.
---

## Streaming With Stream Worker

### Problem

Worker output arrives incrementally and should not be buffered as one final result.

### Solution

Register `exposeStream()` and consume `createStreamWorker().runStream()`.

```ts
// progress.worker.ts
import { exposeStream } from '@vielzeug/familiar/protocol';

exposeStream(async function* (count: number) {
  for (let value = 0; value < count; value++) yield value;
});
```

```ts
import { createStreamWorker } from '@vielzeug/familiar';

const pool = createStreamWorker<number, number>(new URL('./progress.worker.ts', import.meta.url));

for await (const value of pool.runStream(3)) {
  console.log(value);
}
pool.dispose();
```

### Pitfalls

- Stream pools expose only stream work; use `createWorker()` for single-result tasks.
- Abort signal cancellation stops queued, waiting, and active streams.

### Related

- [Module Worker](./module-worker.md)
- [Usage Guide](../usage.md)
