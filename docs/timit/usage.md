---
title: Timit — Usage Guide
description: Parsing, timezone conversion, arithmetic, formatting, and patterns with Timit.
---

# Timit Usage Guide

::: tip New to Timit?
Start with the [Overview](./index.md) for a quick introduction, then use this page for detailed patterns.
:::

[[toc]]

## Parsing Inputs

Use `t.toInstant()` to normalize any time input to a canonical timeline value.
For plain local strings, use `t.parseLocal()` or provide `tz` to `t.toInstant()`.

```ts
import { t } from '@vielzeug/timit';

// ISO strings with offset work automatically
const a = t.toInstant('2026-03-21T10:15:30Z');

// Plain local strings require timezone context
const b = t.toInstant('2026-03-21T10:15:30', { tz: 'Europe/Berlin' });
const c = t.parseLocal('2026-03-21T10:15:30', { tz: 'Europe/Berlin' });

// Dates, epoch numbers, and Temporal types work too
const d = t.toInstant(new Date());
const e = t.toInstant(1711011330000); // epoch ms
```

## Time Zone Conversion

Use `t.toZoned()` to view an instant in a target timezone: same moment, different wall-clock time.

```ts
const utc = '2026-03-21T10:15:30Z';
const tokyo = t.toZoned(utc, { tz: 'Asia/Tokyo' });
const newYork = t.toZoned(utc, { tz: 'America/New_York' });

console.log(tokyo.hour);   // 19 (7:15 PM JST)
console.log(newYork.hour); // 6  (6:15 AM EDT)
```

## Date-Time Arithmetic

`t.shift()` handles DST transitions correctly. Use positive durations to add and negative durations to subtract.

```ts
// Spring forward (2026-03-08 02:00 → 03:00 EDT)
const beforeDst = '2026-03-08T01:30:00-05:00[America/New_York]';
const afterAdd = t.shift(beforeDst, { hours: 1 });
// Result: 2026-03-08T03:30:00-04:00 (correctly skipped to 3:30 EDT)

// Regular arithmetic
const meeting = '2026-03-21T14:00:00Z';
const reminder = t.shift(meeting, { hours: -1 });
```

## Duration Differences

Use `t.diff()` to compute the duration between two times with optional rounding.

```ts
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:30:00Z';

const duration = t.diff(start, end, {
  largestUnit: 'hours',
  smallestUnit: 'minutes',
});

console.log(duration.toString()); // PT2H30M
console.log(duration.hours);      // 2
console.log(duration.minutes);    // 30
```

## Formatting

Use `t.formatHuman()` for localized UI strings and `t.formatISO()` for stable machine output.

```ts
const time = '2026-03-21T10:15:30Z';

// Preset patterns (recommended)
t.formatHuman(time, { pattern: 'short', locale: 'en-GB', tz: 'UTC' });
// → "21/03/2026, 10:15"

// Canonical machine format
t.formatISO(time);
// → "2026-03-21T10:15:30Z"

// Advanced: escape hatch to Intl.DateTimeFormatOptions
t.formatHuman(time, {
  locale: 'de-DE',
  tz: 'Europe/Berlin',
  intl: { hour12: false, weekday: 'long' }
});
// → "Samstag, 21.3.2026, 11:15"
```

### Format Patterns

| Pattern | Example | Use Case |
|---------|---------|----------|
| `'short'` | "21/03/2026, 10:15" | Quick lists |
| `'long'` | "Saturday, March 21, 2026, 10:15:30" | Details |
| `'date-only'` | "21/03/2026" | Calendars |
| `'time-only'` | "10:15" | Clocks, timers |

## Range Queries

Check if a time falls within an inclusive range.

```ts
const now = '2026-03-21T11:00:00Z';
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:00:00Z';

if (t.within(now, start, end)) {
  console.log('Meeting is happening now');
}
```

`t.within()` normalizes range bounds automatically, so reversed ranges still behave predictably.

## Current Time

Get the current time in a specific timezone.

```ts
const localTime = t.now();           // system timezone
const londonTime = t.now('Europe/London');
const sydneyTime = t.now('Australia/Sydney');
```

## Format Ranges

Use `t.formatRange()` for human-friendly time spans.

```ts
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:00:00Z';

const text = t.formatRange(start, end, {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});
// → "3/21/2026, 6:00 AM – 8:00 AM" (if Intl.formatRange supported)
```

## Best Practices

- Use `t.toInstant()` for timeline operations (comparisons, storage).
- Use `t.toZoned()` when you need local wall-clock times (displaying to users).
- Use `t.parseLocal()` for plain local strings.
- Use `t.formatHuman()` for UI and `t.formatISO()` for APIs/logs.
- Store times as instants (ISO strings); convert to zoned only for display.

## Common Patterns

### Schedule a Meeting in a User's Timezone

```ts
const userTz = 'America/New_York';
const scheduledTime = t.toZoned(new Date('2026-04-15T14:00:00Z'), { tz: userTz });

console.log(`Meeting: ${t.formatHuman(scheduledTime, { pattern: 'long' })}`);
```

### Calculate Elapsed Time

```ts
const start = t.now();
// ... do work ...
const elapsed = t.diff(start, t.now(), { largestUnit: 'seconds' });
console.log(`Took ${elapsed.seconds}s`);
```

### Timezone-Aware Event Scheduling

```ts
const event = {
  title: 'Team Standup',
  utc: t.toInstant('2026-03-21T09:00:00Z'),
};

const timezones = ['America/New_York', 'Europe/Berlin', 'Asia/Tokyo'];

for (const tz of timezones) {
  const local = t.toZoned(event.utc, { tz });
  console.log(`${tz}: ${t.formatHuman(local, { pattern: 'short' })}`);
}
```
