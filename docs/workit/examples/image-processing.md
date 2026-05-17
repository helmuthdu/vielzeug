---
title: 'Workit Examples — Image Processing'
description: 'Image Processing examples for workit.'
---

## Image Processing

### Problem

Decoding, filtering, or resizing image data on the main thread causes frame drops. The binary buffer must be sent to a worker, processed, and the result returned — with the UI remaining responsive throughout.

### Solution

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

// Don't forget to dispose when done:
// imagePool.dispose();
```
