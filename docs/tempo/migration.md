---
title: Tempo 3 Migration
description: Migrate Tempo relative formatting and recurrence validation to Tempo 3.
---

[[toc]]

## Tempo 3 Changes

Tempo 3 preserves the timezone-aware arithmetic, comparison, boundary, and sequence APIs. It makes long-span relative formatting calendar-aware and rejects recurrence intervals that cannot advance safely.

## Calendar-Aware Relative Formatting

`formatRelative()` no longer approximates months and years from average elapsed seconds. It resolves complete calendar units in the requested or inferred timezone while preserving localized future and past direction.

```ts
// Tempo 2 — month and year output used average elapsed seconds
formatRelative(target, { base, locale: 'en-US' });

// Tempo 3 — choose the calendar timezone explicitly
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
// Tempo 2 — accepted but did not describe a valid advancing recurrence
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
