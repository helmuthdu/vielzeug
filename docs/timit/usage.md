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

Use `d.asInstant()` to normalize any time input to a canonical timeline value (ignores timezone).

```ts
import { d } from '@vielzeug/timit';

// ISO strings with offset work automatically
const a = d.asInstant('2026-03-21T10:15:30Z');

// Plain strings need a timezone
const b = d.asInstant('2026-03-21T10:15:30', { tz: 'Europe/Berlin' });

// Dates, epoch numbers, and Temporal types work too
const c = d.asInstant(new Date());
const d1 = d.asInstant(1711011330000); // epoch ms
```

## Time Zone Conversion

Use `d.asZoned()` to view an instant in a target timezone—same moment, different wall-clock time.

```ts
const utc = '2026-03-21T10:15:30Z';
const tokyo = d.asZoned(utc, { tz: 'Asia/Tokyo' });
const newYork = d.asZoned(utc, { tz: 'America/New_York' });

console.log(tokyo.hour);   // 19 (7:15 PM JST)
console.log(newYork.hour); // 6  (6:15 AM EDT)
```

## Date-Time Arithmetic

`d.add()` and `d.subtract()` handle DST transitions correctly.

```ts
// Spring forward (2026-03-08 02:00 → 03:00 EDT)
const beforeDst = '2026-03-08T01:30:00-05:00[America/New_York]';
const afterAdd = d.add(beforeDst, { hours: 1 });
// Result: 2026-03-08T03:30:00-04:00 (correctly skipped to 3:30 EDT)

// Regular arithmetic
const meeting = '2026-03-21T14:00:00Z';
const reminder = d.subtract(meeting, { hours: 1 });
```

## Duration Differences

Use `d.diff()` to compute the duration between two times with optional rounding.

```ts
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:30:00Z';

const duration = d.diff(start, end, {
  largestUnit: 'hours',
  smallestUnit: 'minutes',
});

console.log(duration.toString()); // PT2H30M
console.log(duration.hours);      // 2
console.log(duration.minutes);    // 30
```

## Formatting

Use `d.format()` with preset patterns for human-readable output.

```ts
const time = '2026-03-21T10:15:30Z';

// Preset patterns (recommended)
d.format(time, { pattern: 'short', locale: 'en-GB', tz: 'UTC' });
// → "21/03/2026, 10:15"

// Advanced: escape hatch to Intl.DateTimeFormatOptions
d.format(time, { 
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
| `'iso'` | "2026-03-21T10:15:30Z" | APIs, logs |
| `'date-only'` | "21/03/2026" | Calendars |
| `'time-only'` | "10:15" | Clocks, timers |

## Range Queries

Check if a time falls within an inclusive range.

```ts
const now = '2026-03-21T11:00:00Z';
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:00:00Z';

if (d.within(now, start, end)) {
  console.log('Meeting is happening now');
}
```

## Current Time

Get the current time in a specific timezone.

```ts
const localTime = d.now();           // system timezone
const londonTime = d.now('Europe/London');
const sydneyTime = d.now('Australia/Sydney');
```

## Format Ranges

Use `d.formatRange()` for human-friendly time spans.

```ts
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:00:00Z';

const text = d.formatRange(start, end, {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});
// → "3/21/2026, 6:00 AM – 8:00 AM" (if Intl.formatRange supported)
```

## Best Practices

- Use `d.asInstant()` for timeline operations (comparisons, storage).
- Use `d.asZoned()` when you need local wall-clock times (displaying to users).
- Always provide a `tz` when parsing plain strings without offsets.
- Let format presets handle 80% of cases; use `intl` escape hatch only when needed.
- Store times as instants (ISO strings); convert to zoned only for display.

## Common Patterns

### Schedule a Meeting in a User's Timezone

```ts
const userTz = 'America/New_York';
const scheduledTime = d.asZoned(new Date('2026-04-15T14:00:00Z'), { tz: userTz });

console.log(`Meeting: ${d.format(scheduledTime, { pattern: 'long' })}`);
```

### Calculate Elapsed Time

```ts
const start = d.now();
// ... do work ...
const elapsed = d.diff(start, d.now(), { largestUnit: 'seconds' });
console.log(`Took ${elapsed.seconds}s`);
```

### Timezone-Aware Event Scheduling

```ts
const event = {
  title: 'Team Standup',
  utc: d.asInstant('2026-03-21T09:00:00Z'),
};

const timezones = ['America/New_York', 'Europe/Berlin', 'Asia/Tokyo'];

for (const tz of timezones) {
  const local = d.asZoned(event.utc, { tz });
  console.log(`${tz}: ${d.format(local, { pattern: 'short' })}`);
}
```

