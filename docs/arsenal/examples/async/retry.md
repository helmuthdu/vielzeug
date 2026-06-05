---
title: 'Arsenal Examples — retry'
description: 'retry example for @vielzeug/arsenal.'
---

## retry

### Problem

A network call or external API is flaky and fails occasionally. You need automatic retries with configurable delay and the ability to cancel early or skip certain error types.

### Solution

Use `retry(fn, options)` to re-run an async function up to `times` attempts. The callback receives an `AbortSignal` that fires when a per-attempt `timeout` expires or the external `signal` is aborted.

```ts
import { retry, backoff } from '@vielzeug/arsenal';

const data = await retry(
  (signal) => fetch('/api/health', { signal }).then((r) => r.json()),
  {
    times: 4,
    timeout: 5_000,
    delay: (failureIndex) => backoff(failureIndex), // 1s, 2s, 4s, 8s
    shouldRetry: (err, failureIndex) => {
      // failureIndex is 0-based: 0 = first failure
      // NOT called on the final exhausting attempt
      return failureIndex < 3 && !(err instanceof TypeError);
    },
  },
);
```

#### Basic usage

```ts
import { retry } from '@vielzeug/arsenal';

const result = await retry(() => fetch('/api').then((r) => r.json()), { times: 3, delay: 250 });
```

#### With external cancellation

```ts
import { retry } from '@vielzeug/arsenal';

const controller = new AbortController();

const result = await retry(
  (signal) => fetch('/api/data', { signal }).then((r) => r.json()),
  { times: 3, signal: controller.signal },
);

controller.abort(); // cancels retries mid-flight
```

### Pitfalls

- `shouldRetry` is **not** called on the final (exhausting) attempt — it only guards intermediate retries.
- `failureIndex` is 0-based: index `0` is the first failure, index `1` is the second, and so on.
- When a `timeout` is set, the `signal` passed to `fn` fires after `timeout` ms — pass it to `fetch` or other cancellable APIs.
- On exhaustion, the last error is re-thrown unchanged.

### Related

- [attempt](./attempt.md)
- [backoff](../math/backoff.md)
- [abortable](./abortable.md)
