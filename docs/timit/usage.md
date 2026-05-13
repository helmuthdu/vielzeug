---
title: Timit - Usage Guide
description: Parsing, timezone conversion, arithmetic, boundaries, and formatting with Timit.
---

[[toc]]

## Import Style

Use named imports for tree-shaking and discoverability.

```ts
import {
  clamp,
  formatHuman,
  formatInstant,
  formatZoned,
  formatRelative,
  now,
  shift,
  startOf,
  toInstant,
  toZoned,
  within,
} from '@vielzeug/timit';
```

## Parsing and Conversion

Use `parseLocal()` for wall-clock strings.
Use `toInstant()` for timeline-safe values.
Use `toZoned()` for display in a specific timezone.

```ts
import { parseLocal, toInstant, toZoned } from '@vielzeug/timit';

const local = parseLocal('2026-03-21T10:15:30');
const instant = toInstant(local, { tz: 'Europe/Berlin' });
const tokyo = toZoned(instant, { tz: 'Asia/Tokyo' });
```

## DST-Safe Arithmetic

`shift()` handles DST transitions correctly.

```ts
import { shift } from '@vielzeug/timit';

const before = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');
const after = shift(before, { hours: 1 });

console.log(after.toString());
// 2026-03-08T03:30:00-04:00[America/New_York]
```

## Difference and Range Tools

```ts
import { clamp, difference, within } from '@vielzeug/timit';

const duration = difference(Temporal.Instant.from('2026-03-21T10:00:00Z'), Temporal.Instant.from('2026-03-21T12:30:00Z'), {
  tz: 'UTC',
  largestUnit: 'hour',
  smallestUnit: 'minute',
});

const inWindow = within(
  Temporal.Instant.from('2026-03-21T11:00:00Z'),
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:00:00Z'),
);
// clamp returns Temporal.Instant — project to a timezone as needed
const clamped = clamp(
  Temporal.Instant.from('2026-03-21T13:00:00Z'),
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:00:00Z'),
);
const bounded = clamped.toZonedDateTimeISO('UTC');
```

## Comparison Helpers

```ts
import { isAfter, isBefore, isSameDay } from '@vielzeug/timit';

isBefore(Temporal.Instant.from('2026-03-21T10:00:00Z'), Temporal.Instant.from('2026-03-21T11:00:00Z'));
isAfter(Temporal.Instant.from('2026-03-21T12:00:00Z'), Temporal.Instant.from('2026-03-21T11:00:00Z'));
isSameDay(Temporal.Instant.from('2026-03-21T23:30:00Z'), Temporal.Instant.from('2026-03-22T00:15:00Z'), {
  tz: 'America/New_York',
});
```

## Start and End Boundaries

```ts
import { endOf, startOf } from '@vielzeug/timit';

const dayStart = startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
const dayEnd = endOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });

const weekStart = startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'week', {
  tz: 'Europe/Berlin',
  weekStartsOn: 1,
});
```

## Formatting

Use `formatHuman()` for UI, `formatInstant()`/`formatZoned()` for machine output, `formatRelative()` for UX copy.

```ts
import { formatHuman, formatInstant, formatRange, formatRelative, formatZoned } from '@vielzeug/timit';

const instant = Temporal.Instant.from('2026-03-21T10:15:30Z');

formatHuman(instant, { pattern: 'short', locale: 'en-GB', tz: 'UTC' });
formatInstant(instant);
formatZoned(instant, { tz: 'Europe/Berlin' });

formatRange(Temporal.Instant.from('2026-03-21T10:00:00Z'), Temporal.Instant.from('2026-03-21T12:00:00Z'), {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});

formatRelative(Temporal.Instant.from('2026-03-21T12:00:00Z'), {
  base: Temporal.Instant.from('2026-03-21T10:00:00Z'),
  locale: 'en-US',
  numeric: 'always',
});
```

## Duration Helpers

```ts
import { formatDuration, parseDuration } from '@vielzeug/timit';

const duration = parseDuration('PT2H30M');
const text = formatDuration(duration, { locale: 'en-US', style: 'short' });
```

## Best Practices

- Store instants (`Temporal.Instant`) in persistence and APIs.
- Use Temporal constructors (`Temporal.Instant.from`, `Temporal.ZonedDateTime.from`) at system boundaries.
- Convert to zoned values only for user-facing rendering.
- Pass `tz` whenever converting local wall-clock values.
- Use `formatHuman` for UI, `formatInstant` for transport/logging, and `formatZoned` for zoned ISO strings.
