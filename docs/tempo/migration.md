---
title: Tempo Migration
description: Migrate Tempo to the narrowed core API, shared Temporal gateway, and calendar-aware relative formatting.
---

[[toc]]

## Breaking Changes Since 26.11.11

Tempo's surface was narrowed to its core: parsing, timezone resolution, DST-safe arithmetic, boundaries, comparison predicates, and the `Intl` formatting suite. Speculative and app-level clusters were removed, and `inTimeZone()` was replaced by the symmetric `toInstant()`/`toZoned()` pair.

Removed exports:

- `contains()` / `clamp()` — range checks are two `Instant` comparisons; use `isBefore()`/`isAfter()` or compare `epochMilliseconds` directly.
- `classifyExpiry()` (with `FixedDuration`, `ExpiryThresholds`, `ClassifyExpiryInput`) — expiry buckets are application policy; express thresholds with `difference()` in the app that owns them.
- `timeDiff()` / `humanize()` (with `TimeDiffUnit`, `TimeDiffResult`) — `formatRelative()` localizes the same spans, and `Temporal.Duration` plus `formatDuration()` cover unit-level rendering.
- `dateRange()` / `recurrence()` (with `RecurrenceRule`) — lazy calendar walks are a few lines of `Temporal` arithmetic in the app that needs them; the toy recurrence subset was never RRULE-compatible.
- `RelativeTimeInput` — use `AbsoluteTime` directly.

### `inTimeZone()` becomes `toZoned()`

```ts
// Before
import { inTimeZone } from '@vielzeug/tempo';
const local = inTimeZone(instant, 'Europe/Berlin');

// After
import { toZoned } from '@vielzeug/tempo';
const local = toZoned(instant, { timeZone: 'Europe/Berlin' });
```

`toZoned()` mirrors `toInstant()`: named options, an explicit `timeZone`, and DST `disambiguation` for wall-clock inputs.

### `formatRange()` and `formatRangeParts()` accept reversed bounds

`Intl.DateTimeFormat.formatRange` throws a native `RangeError` when the first value is later than the second. Tempo ranges are now order-free: reversed inputs are sorted before formatting, matching the normalized bounds the old `contains()`/`clamp()` provided.

## Tempo 3 Changes

Tempo 3 preserves the timezone-aware arithmetic, comparison, boundary, and sequence APIs. It makes long-span relative formatting calendar-aware and rejects recurrence intervals that cannot advance safely.

## Calendar-Aware Relative Formatting

`formatRelative()` no longer approximates months and years from average elapsed seconds. It resolves complete calendar units in the requested or inferred timezone while preserving localized future and past direction.

```ts
// Tempo 2: month and year output used average elapsed seconds
formatRelative(target, { base, locale: 'en-US' });

// Tempo 3: choose the calendar timezone explicitly
formatRelative(target, {
  base,
  locale: 'en-US',
  timeZone: 'America/New_York',
});
```

When both values are `Instant`, the default calendar timezone is UTC. One `ZonedDateTime` supplies its timezone. Two zoned values with different timezones require `options.timeZone` so the calendar boundary is unambiguous.

## Validate Recurrence Intervals

`recurrence()` now requires `interval` to be a positive safe integer and `count` to be a non-negative safe integer. Tempo 2 accepted zero or fractional values, which could repeat timestamps or produce unclear schedules.

```ts
// Tempo 2: accepted but did not describe a valid advancing recurrence
recurrence(start, { count: 4, frequency: 'weekly', interval: 0 });

// Tempo 3
recurrence(start, { count: 4, frequency: 'weekly', interval: 2 });
```

`dateRange()` continues to reject duration steps that do not advance time.

## Tempo 2 Changes

Tempo 2 makes string parsing and timezone conversion explicit. It removes auto-detection and old parser-specific helpers.

Removed exports:

- `parseInstant`
- `parseZoned`
- `parsePlainDateTime`
- `parsePlainDate`
- `inTz`
- `within`
- `expires`

### Parse With a Target

```ts
// Tempo 1
const instant = parseInstant(value);
const date = parsePlainDate(value);

// Tempo 2
const instant = parse(value, { as: 'instant' });
const date = parse(value, { as: 'plainDate' });
```

### Rename Timezone Options

```ts
// Tempo 1
const instant = toInstant(local, { prefer: 'later', tz: 'America/New_York' });

// Tempo 2
const instant = toInstant(local, {
  disambiguation: 'later',
  timeZone: 'America/New_York',
});
```

`now('UTC')` becomes `now({ timeZone: 'UTC' })`. `inTz(value, zone)` becomes `inTimeZone(value, zone)`.

### Classify Fixed Expiry Durations

`expires()` becomes `classifyExpiry()` and uses named input. Thresholds no longer accept months or years because those are calendar-relative and must not be approximated.

```ts
const status = classifyExpiry({
  thresholds: { expired: { days: 0 }, warning: { days: 14 } },
  value: expiresAt,
});

const label = status ?? 'safe';
```

### Temporal Export

`Temporal` remains exported from `@vielzeug/tempo`. No migration is needed for advanced Temporal use.

### Narrow Errors With `instanceof`

`TempoError.is()` is removed. Use `instanceof TempoError` to narrow any tempo-originated error.

```ts
// Tempo 1
if (TempoError.is(err)) { ... }

// Tempo 2
if (err instanceof TempoError) { ... }
```
