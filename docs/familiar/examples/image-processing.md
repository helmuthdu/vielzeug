---
title: Image Processing
description: Transfer image pixels to a module-worker pool.
---

## Image Processing

### Problem

Image transforms should not block rendering or duplicate large buffers.

### Solution

Transfer image buffer into a worker module.

```ts
import { createWorker } from '@vielzeug/familiar';

type ImageTask = { height: number; pixels: Uint8ClampedArray; width: number };
type ImageResult = ImageTask;

const pool = createWorker<ImageTask, ImageResult>(new URL('./grayscale.worker.ts', import.meta.url), { concurrency: 2 });
const imageData = new ImageData(1, 1);

try {
  const result = await pool.run(
    { pixels: imageData.data, width: imageData.width, height: imageData.height },
    { transferables: [imageData.data.buffer] },
  );
  console.log(result);
} finally {
  pool.dispose();
}
```

### Pitfalls

- Transferred buffers detach in caller.
- Worker output must remain structured-cloneable.

### Related

- [Using Transferables](./using-transferables.md)
