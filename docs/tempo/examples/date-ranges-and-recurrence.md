---
title: 'Tempo Examples — Date Ranges and Recurrence'
description: 'Generate validated lazy date ranges and recurring zoned values.'
---

## Date Ranges and Recurrence

### Problem

Calendar views and schedules need lazy zoned sequences that advance safely across DST changes.

### Solution

Use `dateRange()` for bounded ranges and `recurrence()` for count- or date-limited schedules.

```ts
import { dateRange, parse, recurrence } from '@vielzeug/tempo';

const start = parse('2026-03-01T09:00:00[America/New_York]', { as: 'zonedDateTime' });
const end = parse('2026-03-03T09:00:00[America/New_York]', { as: 'zonedDateTime' });

const days = [...dateRange(start, end, { days: 1 })];
const fortnightly = [...recurrence(start, { count: 4, frequency: 'weekly', interval: 2 })];
```

### Pitfalls

- `dateRange()` rejects steps that do not advance time.
- `recurrence()` requires a positive safe-integer interval and a non-negative safe-integer count.
- Pass `timeZone` when the starting value is plain or an instant.

### Related

- [DST-Safe Arithmetic](./dst-safe-arithmetic.md)
- [Usage Guide](../usage.md)
- [API Reference](../api.md)
