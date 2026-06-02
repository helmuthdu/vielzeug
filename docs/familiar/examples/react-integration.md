---
title: 'Familiar Examples — React Integration'
description: 'React Integration example for @vielzeug/familiar.'
---

## React Integration

### Problem

A React component needs to offload expensive computation to a worker pool. The pool must be created once, survive re-renders, and be closed when the component unmounts.

### Solution

Off-load processing from React components without blocking renders:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { createWorker } from '@vielzeug/familiar';

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

- Creating `createWorker` in the component body (not inside `useMemo`) spawns new Worker threads on every render. Always stabilize the reference with `useMemo` or `useRef`.
- `worker` can be stale between effect cleanup and the next setup. Guard calls with optional chaining (`worker?.run()`) rather than the non-null assertion.
- Workers run in an isolated scope — task functions cannot close over main-thread variables. Encode all required values into the input payload.

### Related

- [Cancellable Batch](./cancellable-batch.md) — cancel tasks when the component unmounts
- [Data Transformation Pipeline](./data-transformation-pipeline.md) — offloading CPU-bound dataset work
