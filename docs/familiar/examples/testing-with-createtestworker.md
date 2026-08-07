---
title: Testing With createTestWorker
description: Test task-pool consumers with structured-clone and error parity.
---

## Testing With createTestWorker

### Problem

Consumer code needs task-pool behavior without loading an actual module worker.

### Solution

Use `createTestWorker()` for task pools. It clones data, wraps task errors, records settlements, and supports timeout/cancellation.

```ts
import { expect } from 'vitest';
import { createTestWorker } from '@vielzeug/familiar/testing';

const pool = createTestWorker((value: number) => value * 2);

expect(await pool.run(21)).toBe(42);
expect(pool.calls).toEqual([{ input: 21, status: 'fulfilled', value: 42 }]);
pool.dispose();
```

### Pitfalls

- Test worker-module business logic directly.
- `createTestWorker()` does not execute modules or stream handlers.

### Related

- [API Reference](../api.md)
