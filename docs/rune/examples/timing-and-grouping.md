---
title: 'Rune Examples — Timing and Grouping'
description: 'Timing and Grouping examples for rune.'
---

## Timing and Grouping

### Problem

You need to measure how long a code block takes and group the related log entries so they are easy to correlate in output — without sprinkling `Date.now()` calls across the codebase.

### Solution

```ts
import { Rune } from '@vielzeug/rune';

const result = await Rune.groupCollapsed('Checkout', async () => {
  Rune.info('validating cart');

  return Rune.time('process-order', () => processOrder(cart));
});
```


### Pitfalls

- `console.time()`/`console.timeEnd()` share a global namespace. Two concurrent operations using the same label will interfere. Use unique labels (e.g., include a request ID) per measurement.
- The timer measures wall-clock time, not CPU time. Event-loop blocking is indistinguishable from a long async wait. Use `performance.now()` for higher-precision measurements.
- Log grouping is a transport concern. Plain text transports output group entries as flat lines with no visual nesting — only console-based or structured transports render groups.

### Related

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [Production Setup](./production-setup.md)
