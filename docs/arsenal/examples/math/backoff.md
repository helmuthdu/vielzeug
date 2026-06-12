---
title: 'Arsenal Examples — backoff'
description: 'backoff example for @vielzeug/arsenal.'
---

## backoff

### Problem

You need exponential backoff delays for a retry loop — doubling the wait on each failure up to a configurable maximum.

### Solution

Use `backoff(attempt, maxMs?)` to compute `min(1000 × 2^attempt, maxMs)`. Multiply by `Math.random()` for full-jitter.

```ts
import { backoff, retry } from '@vielzeug/arsenal';

const data = await retry((signal) => fetch('/api/data', { signal }).then((r) => r.json()), {
  times: 5,
  delay: (failureIndex) => backoff(failureIndex) * Math.random(),
  //              0: ~500ms, 1: ~1s, 2: ~2s, 3: ~4s (capped at 30s default)
});
```

#### Standalone

```ts
import { backoff } from '@vielzeug/arsenal';

backoff(0); // 1000
backoff(1); // 2000
backoff(2); // 4000
backoff(3, 5_000); // 5000 — capped at maxMs
```

### Pitfalls

- Returns a deterministic value — add `* Math.random()` for jitter to avoid thundering herd.
- `attempt` is 0-based: `backoff(0)` = 1000 ms (1 second).

### Related

- [retry](../async/retry.md)
- [sleep](../async/sleep.md)
