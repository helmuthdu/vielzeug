---
title: 'Workit Examples — React Integration'
description: 'React Integration examples for workit.'
---

## React Integration

## Problem

Implement react integration in a production-friendly way with `@vielzeug/workit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/workit` installed.

Off-load processing from React components without blocking renders:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { createWorker } from '@vielzeug/workit';

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

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.
- Worker is properly disposed on component unmount.
- Errors are caught and displayed.
- Pending state is correctly managed through cancellation tokens.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.
- Creating workers without memoization causes unnecessary recreations.

## Related Recipes

- [Cancellable Batch](./cancellable-batch.md)
- [Data Transformation Pipeline](./data-transformation-pipeline.md)
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
