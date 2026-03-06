---
title: Workit — Examples
description: Real-world recipes for workit — image processing, data transformation, progress reporting, and React integration.
---

# Workit Examples

::: tip
These are copy-paste ready recipes. See the [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Using External Scripts (importScripts)

Use `scripts` to pull in CDN libraries without bundling them. The URLs are loaded via `importScripts()` before the task function runs, so their globals are available inside the worker:

```ts
import { createWorker, createWorkerPool } from '@vielzeug/workit';

// Single worker — lodash available as `_`
const slugify = createWorker<string, string>(
  (text) => _.kebabCase(text),
  { scripts: ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'] },
);

console.log(await slugify.run('Hello World')); // 'hello-world'
slugify.terminate();

// Pool — all workers share the same scripts list
const summarise = createWorkerPool<{ sentences: string[] }, string>(
  ({ sentences }) => sentences.map((s) => _.truncate(s, { length: 60 })).join(' '),
  {
    size: 4,
    scripts: ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'],
  },
);

const results = await summarise.runAll(paragraphs);
summarise.terminate();
```

::: tip
Script URLs must be accessible from the Worker origin. For local development, host scripts via your dev server or use a CORS-enabled CDN.
:::

---

## Image Processing

Process images off the main thread to avoid frame drops:

```ts
import { createWorkerPool } from '@vielzeug/workit';

type ImageTask = { pixels: Uint8ClampedArray; width: number; height: number };
type ImageResult = { pixels: Uint8ClampedArray };

const imagePool = createWorkerPool<ImageTask, ImageResult>(
  ({ pixels, width, height }) => {
    const output = new Uint8ClampedArray(pixels.length);
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      output[i] = output[i + 1] = output[i + 2] = gray;
      output[i + 3] = pixels[i + 3];
    }
    return { pixels: output };
  },
  { size: 2 },
);

async function convertToGrayscale(imageData: ImageData): Promise<ImageData> {
  const { pixels } = await imagePool.run({
    pixels: imageData.data,
    width: imageData.width,
    height: imageData.height,
  });
  return new ImageData(pixels, imageData.width, imageData.height);
}
```

---

## Data Transformation Pipeline

Apply CPU-bound transforms to large datasets without blocking the UI:

```ts
import { createWorkerPool } from '@vielzeug/workit';

type Row = { id: number; values: number[] };
type Stats = { id: number; mean: number; stdDev: number };

const statsPool = createWorkerPool<Row, Stats>(
  ({ id, values }) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return { id, mean, stdDev: Math.sqrt(variance) };
  },
  { size: navigator.hardwareConcurrency ?? 4 },
);

// Process 10 000 rows concurrently
const rows: Row[] = loadDataset();
const stats = await statsPool.runAll(rows);

statsPool.terminate();
```

---

## Cancellable Batch

Use `AbortController` to cancel a long-running batch when the user navigates away:

```ts
import { createWorkerPool } from '@vielzeug/workit';

const pool = createWorkerPool<string, string>(
  async (url) => {
    const r = await fetch(url);
    return r.text();
  },
  { size: 4, timeout: 8000 },
);

function startBatch(urls: string[]) {
  const ac = new AbortController();

  const promise = pool.runAll(urls, ac.signal).catch((err) => {
    if (err.name === 'AbortError') console.log('Batch cancelled');
    else throw err;
  });

  return {
    result: promise,
    cancel: () => ac.abort(),
  };
}

// Usage
const batch = startBatch(urlList);
// User navigates away:
batch.cancel();
```

---

## React Integration

Off-load processing from React components without blocking renders:

```tsx
import { useEffect, useRef, useState } from 'react';
import { createWorker, type WorkerHandle } from '@vielzeug/workit';

type SortInput = { data: number[] };
type SortOutput = { sorted: number[] };

// Create once outside the component — reused across renders
const sortWorker = createWorker<SortInput, SortOutput>(
  ({ data }) => ({ sorted: [...data].sort((a, b) => a - b) }),
);

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
    return () => { cancelled = true; };
  }, [data]);

  if (pending) return <p>Sorting…</p>;
  return <ul>{sorted.map((n) => <li key={n}>{n}</li>)}</ul>;
}
```

---

## Testing with createTestWorker

```ts
import { createTestWorker } from '@vielzeug/workit';
import { describe, expect, it } from 'vitest';

type Input = { a: number; b: number };
type Output = { sum: number; product: number };

describe('math worker', () => {
  it('computes sum and product', async () => {
    const { worker, calls, dispose } = createTestWorker<Input, Output>(
      ({ a, b }) => ({ sum: a + b, product: a * b }),
    );

    expect(await worker.run({ a: 3, b: 4 })).toEqual({ sum: 7, product: 12 });
    expect(await worker.run({ a: 5, b: 6 })).toEqual({ sum: 11, product: 30 });

    expect(calls).toHaveLength(2);
    expect(calls[0].input).toEqual({ a: 3, b: 4 });
    expect(calls[1].output.sum).toBe(11);

    dispose();
  });

  it('rejects after dispose', async () => {
    const { worker, dispose } = createTestWorker<number, number>((n) => n);
    dispose();
    await expect(worker.run(1)).rejects.toThrow('terminated');
  });
});
```

---

## Fibonacci with Pool and Timeout

Classic CPU-bound example with a safety timeout:

```ts
import { createWorkerPool } from '@vielzeug/workit';

const fibPool = createWorkerPool<number, number>(
  function fib(n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  },
  { size: 4, timeout: 5000 },
);

const inputs = [30, 32, 34, 36, 38, 40];
const results = await fibPool.runAll(inputs);
console.log(results); // [832040, 2178309, 5702887, 14930352, 39088169, 102334155]

fibPool.terminate();
```
