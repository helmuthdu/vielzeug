---
title: 'Arsenal Examples — taskPool'
description: 'taskPool example for @vielzeug/arsenal.'
---

## taskPool

### Problem

You need bounded concurrent work with cancellation during teardown.

### Solution

```ts
import { taskPool } from '@vielzeug/arsenal/async';

const pool = taskPool({ concurrency: 2 });
const results = await Promise.all(
  urls.map((url) => pool.run((signal) => fetch(url, { signal }).then((response) => response.json()))),
);

await pool.idle();
pool.dispose();
```

### Pitfalls

- Tasks must pass supplied signal to cancellable work.
- `dispose()` rejects pending tasks but running work stops only when it observes signal.
