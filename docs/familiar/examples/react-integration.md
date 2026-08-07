---
title: React Integration
description: Own a module-worker pool through React component lifecycle.
---

## React Integration

### Problem

Worker pool must survive renders and stop stale requests on unmount or input replacement.

### Solution

Create pool once, abort obsolete work during effect cleanup, then dispose on unmount.

```tsx
import { useEffect, useMemo } from 'react';
import { createWorker } from '@vielzeug/familiar';

type SortInput = { data: number[] };
type SortOutput = number[];

const pool = useMemo(
  () => createWorker<SortInput, SortOutput>(new URL('./sort.worker.ts', import.meta.url)),
  [],
);

useEffect(() => () => pool.dispose(), [pool]);

useEffect(() => {
  const controller = new AbortController();
  void pool.run({ data }, { signal: controller.signal }).then(setSorted);
  return () => controller.abort();
}, [data, pool]);
```

### Pitfalls

- Keep worker URL stable with pool lifecycle.
- Handle `AbortError` as expected stale work.

### Related

- [Cancellable Batch](./cancellable-batch.md)
