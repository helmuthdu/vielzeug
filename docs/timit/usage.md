---
title: Timit — Usage Guide
description: Parsing, timezone conversion, arithmetic, formatting, and patterns with Timit.
---

# Timit Usage Guide

::: tip New to Timit?
Start with the [Overview](./index.md) for a quick introduction, then use this page for detailed patterns.
:::

[[toc]]

## Import Style

Import the `timit` namespace for collision-free usage.

```ts
import { timit } from '@vielzeug/timit';

const meeting = timit.toZoned(timit.now(), { tz: 'America/New_York' });
const reminder = timit.add(meeting, { minutes: -15 });
```

You can also destructure if you prefer short names in a local scope:

```ts
const { add, now, toZoned } = timit;
```

## Parsing Inputs

Use `parse()` when you need a local wall-clock value without timezone context.
Use `toInstant()` to normalize any supported input to a canonical timeline value.
For plain local values, provide `tz` to `toInstant()`.

```ts
import { Temporal } from '@js-temporal/polyfill';
import { timit } from '@vielzeug/timit';

// ISO strings with offset work automatically
const a = timit.toInstant('2026-03-21T10:15:30Z');

// Plain local strings require timezone context
const b = timit.toInstant('2026-03-21T10:15:30', { tz: 'Europe/Berlin' });
const c = timit.toZoned('2026-03-21T10:15:30', { tz: 'Europe/Berlin' });

// Parse local wall-clock value without a timezone
const local = timit.parse('2026-03-21');

// Temporal types work too
const d = timit.toInstant(Temporal.Instant.from('2026-03-21T10:15:30Z'));
const e = timit.toInstant(Temporal.PlainDate.from('2026-03-21'), { tz: 'Europe/Berlin' });
```

## Time Zone Conversion

Use `toZoned()` to view an instant in a target timezone: same moment, different wall-clock time.

```ts
const utc = '2026-03-21T10:15:30Z';
const tokyo = timit.toZoned(utc, { tz: 'Asia/Tokyo' });
const newYork = timit.toZoned(utc, { tz: 'America/New_York' });

console.log(tokyo.hour);   // 19 (7:15 PM JST)
console.log(newYork.hour); // 6  (6:15 AM EDT)
```

## Date-Time Arithmetic

`add()` handles DST transitions correctly. Use positive durations to add and negative durations to subtract.
For absolute inputs (instants), omission of `tz` means results are viewed in the system timezone.

```ts
// Spring forward (2026-03-08 02:00 → 03:00 EDT)
const beforeDst = '2026-03-08T01:30:00-05:00[America/New_York]';
const afterAdd = timit.add(beforeDst, { hours: 1 });
// Result: 2026-03-08T03:30:00-04:00 (correctly skipped to 3:30 EDT)

// Regular arithmetic
const meeting = '2026-03-21T14:00:00Z';
const reminder = timit.add(meeting, { hours: -1 });
```

## Duration Differences

Use `difference()` to compute the duration between two times with optional rounding.

```ts
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:30:00Z';

const duration = timit.difference(start, end, {
  largestUnit: 'hour',
  smallestUnit: 'minute',
});

console.log(duration.toString()); // PT2H30M
console.log(duration.hours);      // 2
console.log(duration.minutes);    // 30
```

## Formatting

Use `format()` for localized UI strings and `formatIso()` for stable machine output.

```ts
const time = '2026-03-21T10:15:30Z';

// Preset patterns (recommended)
timit.format(time, { pattern: 'short', locale: 'en-GB', tz: 'UTC' });
// → "21/03/2026, 10:15"

// Canonical machine format
timit.formatIso(time);
// → "2026-03-21T10:15:30Z"

// Advanced: escape hatch to Intl.DateTimeFormatOptions
timit.format(time, {
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
| `'medium'` | "21 Mar 2026, 10:15" | Balanced default |
| `'long'` | "Saturday, March 21, 2026, 10:15:30" | Details |
| `'date-only'` | "21/03/2026" | Calendars |
| `'time-only'` | "10:15" | Clocks, timers |

## Range Queries

Check if a time falls within an inclusive range.

```ts
const now = '2026-03-21T11:00:00Z';
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:00:00Z';

if (timit.within(now, start, end)) {
  console.log('Meeting is happening now');
}
```

`within()` normalizes range bounds automatically, so reversed ranges still behave predictably.

## Current Time

Get the current time in a specific timezone.

```ts
const localTime = timit.now();           // system timezone
const londonTime = timit.now('Europe/London');
const sydneyTime = timit.now('Australia/Sydney');
```

## Format Ranges

Use `formatRange()` for human-friendly time spans.

```ts
const start = '2026-03-21T10:00:00Z';
const end = '2026-03-21T12:00:00Z';

const text = timit.formatRange(start, end, {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});
// → "3/21/2026, 6:00 AM – 8:00 AM"
```

## Best Practices

- Use `timit.toInstant()` for timeline operations (comparisons, storage).
- Use `timit.toZoned()` when you need local wall-clock times (displaying to users).
- Use `timit.format()` for UI and `timit.formatIso()` for APIs/logs.
- Store times as instants (ISO strings); convert to zoned only for display.

## Common Patterns

### Schedule a Meeting in a User's Timezone

```ts
const userTz = 'America/New_York';
const scheduledTime = timit.toZoned('2026-04-15T14:00:00Z', { tz: userTz });

console.log(`Meeting: ${timit.format(scheduledTime, { pattern: 'long' })}`);
```

### Calculate Elapsed Time

```ts
const start = timit.now();
// ... do work ...
const elapsed = timit.difference(start, timit.now(), { largestUnit: 'second' });
console.log(`Took ${elapsed.seconds}s`);
```

### Timezone-Aware Event Scheduling

```ts
const event = {
  title: 'Team Standup',
  utc: timit.toInstant('2026-03-21T09:00:00Z'),
};

const timezones = ['America/New_York', 'Europe/Berlin', 'Asia/Tokyo'];

for (const tz of timezones) {
  const local = timit.toZoned(event.utc, { tz });
  console.log(`${tz}: ${timit.format(local, { pattern: 'short' })}`);
}
```
