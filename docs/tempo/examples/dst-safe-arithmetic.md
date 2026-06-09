---
title: 'Tempo Examples — DST-Safe Arithmetic'
description: 'DST-safe date arithmetic example for @vielzeug/tempo.'
---

## DST-Safe Arithmetic

### Problem

Standard millisecond math with `Date` loses DST context. Adding one hour to a wall-clock time just before the DST "spring forward" produces the wrong clock time — it lands in the skipped hour gap. The same issue affects "fall back" transitions, where the same wall-clock hour appears twice.

### Solution

Use `shift()` to add or subtract duration. It delegates to the Temporal calendar system, which resolves DST transitions correctly using the target timezone.

```ts
import { difference, parsePlainDateTime, shift, toInstant } from '@vielzeug/tempo';

// Spring forward: March 8, 2026 — clocks jump 1:59 AM → 3:00 AM EDT
const before = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');
const after = shift(before, { hours: 1 });
// → '2026-03-08T03:30:00-04:00[America/New_York]'  (skips the gap)

// Fall back: the 1:30 AM hour happens twice on November 1 — use prefer: 'earlier'/'later'
// to pick which occurrence. Input must be a PlainDateTime (no timezone attached yet).
const ambiguous = parsePlainDateTime('2026-11-01T01:30:00');
const first = toInstant(ambiguous, { tz: 'America/New_York', prefer: 'earlier' });
// → '2026-11-01T05:30:00Z'  (EDT, −4 offset, first occurrence)
const second = toInstant(ambiguous, { tz: 'America/New_York', prefer: 'later' });
// → '2026-11-01T06:30:00Z'  (EST, −5 offset, second occurrence)
```

#### Comparing Across a DST Boundary

`difference()` works correctly even when the range spans a DST transition.

```ts
const lo = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');
const hi = Temporal.ZonedDateTime.from('2026-03-08T04:00:00-04:00[America/New_York]');

const duration = difference(lo, hi, { largestUnit: 'hour' });
console.log(duration.toString()); // PT2H30M — correct wall-clock difference
```

### Pitfalls

- Using `new Date(meeting.getTime() - 30 * 60_000)` when crossing a DST boundary produces the wrong wall-clock time. Always use `shift()` for calendar-aware arithmetic.
- Passing `prefer: 'compatible'` (the default) during a DST gap silently selects the post-gap time. If you need a specific behavior (error on ambiguous times), use `prefer: 'reject'`.
- `difference()` requires `tz` when `largestUnit` is a calendar unit like `'day'` or `'month'`. Omitting it throws when either input is a plain date.

### Related

- [Timezone Conversion](./timezone-conversion.md)
- [API Reference — `shift()`](/tempo/api#shift-input-duration-options-temporal-zoneddatetime)
- [API Reference — `difference()`](/tempo/api#difference-start-end-options-temporal-duration)
