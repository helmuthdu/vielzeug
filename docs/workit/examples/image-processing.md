---
title: 'Workit Examples — Image Processing'
description: 'Image Processing examples for workit.'
---

## Image Processing

## Problem

Implement image processing in a production-friendly way with `@vielzeug/workit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/workit` installed.

Process images off the main thread to avoid frame drops:

```ts
import { createWorker } from '@vielzeug/workit';

type ImageTask = { pixels: Uint8ClampedArray; width: number; height: number };
type ImageResult = { pixels: Uint8ClampedArray };

const imagePool = createWorker<ImageTask, ImageResult>(
  ({ pixels, width, height }) => {
    const output = new Uint8ClampedArray(pixels.length);
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      output[i] = output[i + 1] = output[i + 2] = gray;
      output[i + 3] = pixels[i + 3];
    }
    return { pixels: output };
  },
  { concurrency: 2 },
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
