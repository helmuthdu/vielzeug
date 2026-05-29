---
title: 'Worker Examples — Image Processing'
description: 'Image Processing example for @vielzeug/worker.'
---

## Image Processing

### Problem

Decoding, filtering, or resizing image data on the main thread causes frame drops. The binary buffer must be sent to a worker, processed, and the result returned — with the UI remaining responsive throughout.

### Solution

Process images off the main thread to avoid frame drops:

```ts
import { createWorker } from '@vielzeug/worker';

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

// Don't forget to dispose when done:
// imagePool.dispose();
```

### Pitfalls

- Not using transferables — `imageData.data` is structured-cloned into the worker, doubling memory usage for large images. Pass `imageData.data.buffer` as a transferable instead; see [Using Transferables](./using-transferables.md).
- Calling `imagePool.dispose()` while multiple `convertToGrayscale` calls are still in flight terminates all in-progress tasks with `WorkerError` code `'terminated'`. Dispose only after all outstanding promises have settled.

### Related

- [Using Transferables](./using-transferables.md) — reduce memory overhead by transferring pixel buffers
- [Cancellable Batch](./cancellable-batch.md) — cancel in-flight image tasks on navigation
- [Data Transformation Pipeline](./data-transformation-pipeline.md) — apply sequential transforms to a dataset
