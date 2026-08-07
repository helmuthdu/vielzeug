---
title: Using Transferables
description: Move ArrayBuffer ownership into a module worker.
---

## Using Transferables

### Problem

Large binary payloads should not be copied between main thread and worker.

### Solution

Transfer `ArrayBuffer` ownership with `RunOptions.transferables`.

```ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<{ buffer: ArrayBuffer }, number>(new URL('./sum.worker.ts', import.meta.url));
const buffer = new Uint8Array([1, 2, 3]).buffer;

try {
  const sum = await pool.run({ buffer }, { transferables: [buffer] });
  console.log(sum);
  console.log(buffer.byteLength); // 0
} finally {
  pool.dispose();
}
```

### Pitfalls

- Transferred buffers detach immediately in sender.
- Transfer buffer, not typed-array view.

### Related

- [Image Processing](./image-processing.md)
