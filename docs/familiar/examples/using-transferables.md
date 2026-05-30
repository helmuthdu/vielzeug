---
title: 'Familiar Examples — Using Transferables'
description: 'Using Transferables example for @vielzeug/familiar.'
---

## Using Transferables

### Problem

You need to send a large `ArrayBuffer` (e.g., an image or binary data file) to a worker. Structured-clone copying doubles memory usage — transferring ownership instead moves the buffer with zero copy.

### Solution

Use `transferables` to move large buffers into the Worker without structured-clone copying:

```ts
import { createWorker } from '@vielzeug/familiar';

type Input = {
  buffer: ArrayBuffer;
};

type Output = {
  length: number;
};

const worker = createWorker<Input, Output>(({ buffer }) => {
  const bytes = new Uint8Array(buffer);
  let sum = 0;

  for (const value of bytes) {
    sum += value;
  }

  return {
    length: sum,
  };
});

const bytes = new Uint8Array([1, 2, 3, 4, 5]);
const buffer = bytes.buffer;

// Transfer the buffer — zero-copy move to the worker
const result = await worker.run({ buffer }, { transferables: [buffer] });

console.log(result.length); // 15
console.log(buffer.byteLength); // 0 — buffer is now detached

worker.dispose();
```

::: warning
Once a buffer is transferred it is detached in the sending context. Do not reuse it after the `run()` call.
:::

### Pitfalls

- Accessing the original buffer after `run()` — the buffer is detached the moment it is transferred. Any read returns zero bytes. Copy the buffer with `buffer.slice()` before calling `run()` if the main thread still needs the data.
- Passing a `TypedArray` view (e.g., `Uint8Array`) in `transferables` instead of its `.buffer` — only `ArrayBuffer` is transferable. Pass `typedArray.buffer`, not the typed array itself.

### Related

- [Image Processing](./image-processing.md) — practical example transferring pixel buffers
- [Data Transformation Pipeline](./data-transformation-pipeline.md) — offloading large datasets between threads
