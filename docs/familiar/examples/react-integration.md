---
title: React Integration
description: Inject an application-owned module-worker pool into React effects.
---

## React Integration

### Problem

A worker pool must survive renders while obsolete component work stops during effect cleanup. React Strict Mode must not dispose and then reuse the same pool during development effect replay.

### Solution

Create and dispose the pool at the application boundary, then inject it into components. Component effects own only their individual task signals.

```tsx
import { useEffect } from 'react';
import { createWorker, type WorkerPool } from '@vielzeug/familiar';

type SortInput = { data: number[] };
type SortOutput = number[];

type SortedListProps = {
  data: number[];
  onError(error: unknown): void;
  pool: WorkerPool<SortInput, SortOutput>;
  setSorted(value: SortOutput): void;
};

function SortedList({ data, onError, pool, setSorted }: SortedListProps) {
  useEffect(() => {
    const controller = new AbortController();

    void pool.run({ data }, { signal: controller.signal }).then(setSorted, (error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) onError(error);
    });

    return () => controller.abort();
  }, [data, onError, pool, setSorted]);

  return null;
}

const pool = createWorker<SortInput, SortOutput>(new URL('./sort.worker.ts', import.meta.url));
root.render(<SortedList data={data} onError={reportError} pool={pool} setSorted={setSorted} />);

// At the same application boundary that owns `root`:
function disposeApplication() {
  root.unmount();
  pool.dispose();
}
```

### Pitfalls

- Do not create and dispose a shared pool in a React effect that Strict Mode can replay.
- Keep the worker URL and injected pool stable for the owner lifetime.
- Treat `AbortError` as expected stale-work cancellation.
- Dispose the pool only at the boundary that created it.

### Related

- [Cancellable Batch](./cancellable-batch.md)
- [Usage Guide](../usage.md)
- [API Reference](../api.md)
