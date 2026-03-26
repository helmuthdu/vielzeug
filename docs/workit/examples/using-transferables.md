---
title: 'Workit Examples — Using Transferables'
description: 'Using Transferables examples for workit.'
---

## Using Transferables

## Problem

Implement transferables in a production-friendly way with `@vielzeug/workit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/workit` installed.

Use `transfer` to move large buffers into the Worker without structured-clone copying:

```ts
import { createWorker } from '@vielzeug/workit';

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
const result = await worker.run({ buffer: bytes.buffer }, { transfer: [bytes.buffer] });

console.log(result.length); // 15
worker.dispose();
```

::: warning
Once a buffer is transferred it is detached in the sending context. Do not reuse it after calling `run()`.
:::

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak workers.
- Accidentally reading a transferred buffer after `run()` will fail because the sender loses ownership.
- Not typing the payload can hide transfer mistakes until runtime.

## Related Recipes

- [Cancellable Batch](./cancellable-batch.md)
- [Image Processing](./image-processing.md)
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
