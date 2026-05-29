---
title: 'Worker Examples — React Integration'
description: 'React Integration examples for worker.'
---

## React Integration

### Problem

A React component needs to offload expensive computation to a worker pool. The pool must be created once, survive re-renders, and be closed when the component unmounts.

### Solution

Off-load processing from React components without blocking renders:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { createWorker } from '@vielzeug/worker';

type SortInput = { data: number[] };
type SortOutput = { sorted: number[] };

export function SortedList({ data }: { data: number[] }) {
  const [sorted, setSorted] = useState<number[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create worker once and dispose on unmount
  const worker = useMemo(
    () => createWorker<SortInput, SortOutput>(({ data }) => ({ sorted: [...data].sort((a, b) => a - b) })),
    [],
  );

  useEffect(() => {
    return () => worker.dispose();
  }, [worker]);

  // Trigger sort on data change
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setPending(true);

    worker
      .run({ data })
      .then(({ sorted }) => {
        if (!cancelled) setSorted(sorted);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data, worker]);

  if (error) return <p style={{ color: 'red' }}>Error: {error.message}</p>;
  if (pending) return <p>Sorting…</p>;
  return (
    <ul>
      {sorted.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
```

- Worker is properly disposed on component unmount.
- Errors are caught and displayed.
- Pending state is correctly managed through cancellation tokens.

### Pitfalls

- Creating `createWorkerPool` inside the component body (not in `useRef` or `useEffect`) spawns new Worker threads on every render.
- `poolRef.current` is `null` between `useEffect` cleanup and the next setup. Guard calls with `poolRef.current?.run()` rather than the non-null assertion `poolRef.current!.run()`.
- Workers do not share the main thread's module scope. Functions passed to the worker run in isolation — avoid closures that capture main-thread variables, as they are serialized and lose their references.
- Creating workers without memoization causes unnecessary recreations.

### Related
- [Data Transformation Pipeline](./data-transformation-pipeline)
- [Async Workflows (Ripple)](@vielzeug/ripple/examples/pattern-nextvalue-in-async-workflows)

- [Cancellable Batch](./cancellable-batch.md)
- [Data Transformation Pipeline](./data-transformation-pipeline.md)
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
