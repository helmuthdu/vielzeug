---
title: 'Tempo Examples — Date Ranges and Recurrence'
description: 'Calendar grids, date sequences, and recurring event generation with dateRange() and recurrence().'
---

## Date Ranges and Recurrence

### Problem

Building calendar UIs, generating report periods, or scheduling recurring events requires iterating over sequences of dates. Manual `while` loops with date arithmetic are verbose and error-prone across DST boundaries.

### Solution

Use `dateRange()` for step-based sequences between two dates. Use `recurrence()` for calendar-rule-based repetition (daily/weekly/monthly/yearly with optional interval, count, and until boundary). Both return lazy generators — safe for large ranges.

#### Calendar Grid (Month View)

```ts
import { dateRange, parseZoned } from '@vielzeug/tempo';

const start = parseZoned('2026-03-01T00:00:00[America/New_York]');
const end = parseZoned('2026-03-31T00:00:00[America/New_York]');

// ZonedDateTime inputs — tz inferred, no options needed
const days = [...dateRange(start, end, { days: 1 })];
// [Mar 1, Mar 2, ..., Mar 31]  — all in America/New_York
```

#### Lazy Iteration with Early Exit

```ts
import { dateRange, parseZoned } from '@vielzeug/tempo';

const rangeStart = parseZoned('2026-01-01T00:00:00[UTC]');
const rangeEnd = parseZoned('2026-12-31T00:00:00[UTC]');

// Process only until a condition is met — the generator is never fully materialized
for (const day of dateRange(rangeStart, rangeEnd, { days: 1 })) {
  if (isHoliday(day)) break;
  schedule(day);
}
```

#### Weekly Meetings with a Deadline

```ts
import { parseZoned, recurrence } from '@vielzeug/tempo';

const meetingStart = parseZoned('2026-01-05T09:00:00[Europe/Berlin]');
const deadline = parseZoned('2026-06-30T00:00:00[Europe/Berlin]');

// ZonedDateTime start — tz inferred automatically
for (const meeting of recurrence(meetingStart, { frequency: 'weekly', until: deadline })) {
  calendar.add(meeting);
}
```

#### Bi-Weekly Sprint Planning (Count-Based)

```ts
import { parseZoned, recurrence } from '@vielzeug/tempo';

const sprintStart = parseZoned('2026-01-05T10:00:00[UTC]');

// 6 sprints, every 2 weeks
const sprints = [...recurrence(sprintStart, { frequency: 'weekly', interval: 2, count: 6 })];
// Jan 5, Jan 19, Feb 2, Feb 16, Mar 2, Mar 16
```

#### Quarterly Reports

```ts
import { parseZoned, recurrence } from '@vielzeug/tempo';

const quarterStart = parseZoned('2026-01-01T00:00:00[UTC]');

const quarters = [...recurrence(quarterStart, { frequency: 'monthly', interval: 3, count: 4 })];
// Jan 1, Apr 1, Jul 1, Oct 1
```

#### Plain Inputs Require `tz`

```ts
import { dateRange, parsePlainDate, recurrence } from '@vielzeug/tempo';

// PlainDate inputs — must pass tz explicitly
const days = [...dateRange(parsePlainDate('2026-03-01'), parsePlainDate('2026-03-31'), { days: 1 }, { tz: 'UTC' })];
```

### Pitfalls

- `dateRange()` requires `step` to advance the date forward — passing `{ days: 0 }` or a negative step throws a `RangeError`.
- `recurrence()` throws immediately at call time (not lazily) when neither `count` nor `until` is provided.
- When `start` and `end` are `ZonedDateTime` values in different timezones, `dateRange()` silently re-projects `end` into `start`'s timezone. Pass `options.tz` explicitly to override.
- Generators are lazy — spreading a large range into an array (`[...dateRange(...)]`) materializes all values at once. For very large ranges, prefer `for...of` with a `break`.

### Related

- [DST-Safe Arithmetic](./dst-safe-arithmetic.md)
- [API Reference — `dateRange()`](/tempo/api#daterange-start-end-step-options-generatortemporal-zoneddatetime)
- [API Reference — `recurrence()`](/tempo/api#recurrence-start-rule-options-generatortemporal-zoneddatetime)
