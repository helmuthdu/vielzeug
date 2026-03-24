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
import { useEffect, useState } from 'react';
import { createWorker } from '@vielzeug/workit';

type SortInput = { data: number[] };
type SortOutput = { sorted: number[] };

// Create once outside the component — reused across renders
const sortWorker = createWorker<SortInput, SortOutput>(({ data }) => ({ sorted: [...data].sort((a, b) => a - b) }));

export function SortedList({ data }: { data: number[] }) {
  const [sorted, setSorted] = useState<number[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    sortWorker.run({ data }).then(({ sorted }) => {
      if (!cancelled) setSorted(sorted);
      setPending(false);
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

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

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Cancellable Batch](./cancellable-batch.md)
- [Data Transformation Pipeline](./data-transformation-pipeline.md)
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
