---
title: 'Tempo Examples — Date Ranges and Recurrence'
description: 'Generate lazy timezone-aware calendar sequences with Tempo.'
---

## Date Ranges and Recurrence

### Problem

Calendars and schedules need lazy sequences that preserve timezone and DST behavior.

### Solution

Start with a zoned date-time, then use `dateRange()` or `recurrence()`.

```ts
import { dateRange, parse, recurrence } from '@vielzeug/tempo';

const start = parse('2026-03-01T00:00:00[Europe/Berlin]', { as: 'zonedDateTime' });
const end = parse('2026-03-31T00:00:00[Europe/Berlin]', { as: 'zonedDateTime' });

const days = [...dateRange(start, end, { days: 1 })];
const meetings = [...recurrence(start, { count: 4, frequency: 'weekly' })];
```

### Pitfalls

- `dateRange()` requires a forward-moving step.
- Spreading a large generator materializes every result; prefer `for...of` for streams.
- Plain inputs require an explicit `timeZone` option.

### Related

- [DST-Safe Arithmetic](./dst-safe-arithmetic.md)
- [Usage Guide](../usage.md)
