---
title: 'Rune Examples — Timing and Grouping'
description: 'Timing and Grouping example for @vielzeug/rune.'
---

## Timing and Grouping

### Problem

You need to measure how long a code block takes and group the related log entries so they are easy to correlate in output — without sprinkling `Date.now()` calls across the codebase.

### Solution

Use `time(label, fn)` to measure execution and `groupCollapsed(label, fn)` to nest related log lines under a collapsible group in the console.

```ts
import { defaultLogger } from '@vielzeug/rune';

const result = await defaultLogger.groupCollapsed('Checkout', async () => {
  defaultLogger.info('validating cart');

  return defaultLogger.time('process-order', () => processOrder(cart));
});
```

### Pitfalls

- `time()` always emits at `debug` level with the label as the log message and `{ duration_ms }` in context. If `logLevel` is above `debug`, the timer still runs but no entry is emitted. Set `logLevel: 'debug'` when capturing timing data.
- `time()` measures wall-clock time via `performance.now()`. For async functions, it covers total elapsed time including I/O wait — not CPU time. Long I/O waits will inflate the result.
- `group()` and `groupCollapsed()` call `console.group`/`console.groupEnd` regardless of which transport is configured. They are visual wrappers for the console; other transports (remote, JSON, batch) receive entries as normal flat events with no grouping semantics.
- When `logLevel` is `'off'`, the group wrapper is bypassed entirely but the callback still executes.

### Related

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [Production Setup](./production-setup.md)
- [Request Timing (Courier)](/courier/examples/request-middleware)
