---
title: Tempo — Usage Guide
description: Parsing, timezone conversion, arithmetic, boundaries, and formatting with Tempo.
---

[[toc]]

## Basic Usage

Use named imports from `@vielzeug/tempo` for tree-shaking.

```ts
import { format, now, parsePlainDateTime, shift, toInstant, toZoned } from '@vielzeug/tempo';

// Current time in a timezone
const berlin = now('Europe/Berlin');

// Parse a wall-clock string, then pin it to a timezone
const local = parsePlainDateTime('2026-03-21T10:15:30');
const instant = toInstant(local, { tz: 'America/New_York' });

// Format for display
format(instant, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' });
```

## Parsing and Conversion

All common Temporal constructors have a tempo equivalent — import only from `@vielzeug/tempo`:

| Instead of…                                                 | Use…                              |
| ----------------------------------------------------------- | --------------------------------- |
| `Temporal.Now.instant()`                                    | `nowInstant()`                    |
| `Temporal.Now.zonedDateTimeISO(tz)`                         | `now(tz)`                         |
| `Temporal.Instant.from(str)`                                | `parseInstant(str)`               |
| `Temporal.ZonedDateTime.from(str)`                          | `parseZoned(str)`                 |
| `Temporal.PlainDateTime.from(str)`                          | `parsePlainDateTime(str)`         |
| `Temporal.PlainDate.from(str)`                              | `parsePlainDate(str)`             |
| `Temporal.ZonedDateTime.from` / `Temporal.Instant.from` / … | `parseDate(str)` (unknown format) |

```ts
import {
  isValid,
  nowInstant,
  parseDate,
  parseInstant,
  parsePlainDateTime,
  parsePlainDate,
  parseZoned,
  toInstant,
  toZoned,
} from '@vielzeug/tempo';

// Current instant
const t = nowInstant();

// Wall-clock string from user input or database
const local = parsePlainDateTime('2026-03-21T10:15:30');
const instant = toInstant(local, { tz: 'Europe/Berlin' });
const tokyo = toZoned(instant, { tz: 'Asia/Tokyo' });

// UTC ISO string from an API response
const ts = parseInstant('2026-03-21T10:15:30Z');

// Zoned date-time string
const meeting = parseZoned('2026-03-21T11:00:00+01:00[Europe/Berlin]');

// Date-only string
const date = parsePlainDate('2026-03-21');

// Unknown ISO format — picks the most specific type automatically
parseDate('2026-03-21T11:00:00+01:00[Europe/Berlin]'); // ZonedDateTime
parseDate('2026-03-21T10:00:00Z'); // Instant
parseDate('2026-03-21T10:00:00'); // PlainDateTime
parseDate('2026-03-21'); // PlainDate

// Type guard — validate before passing to Tempo functions
if (isValid(externalValue)) {
  format(externalValue, { pattern: 'short', tz: 'UTC' });
}
```

## DST-Safe Arithmetic

`shift()` handles DST transitions correctly.

```ts
import { parseZoned, shift } from '@vielzeug/tempo';

const before = parseZoned('2026-03-08T01:30:00-05:00[America/New_York]');
const after = shift(before, { hours: 1 });

console.log(after.toString());
// 2026-03-08T03:30:00-04:00[America/New_York]
```

## Difference and Range Tools

```ts
import { clamp, difference, parseInstant, within } from '@vielzeug/tempo';

// difference() returns a signed duration: negative when start is after end
const duration = difference(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T12:30:00Z'), {
  tz: 'UTC',
  largestUnit: 'hour',
  smallestUnit: 'minute',
});

const inWindow = within(
  parseInstant('2026-03-21T11:00:00Z'),
  parseInstant('2026-03-21T10:00:00Z'),
  parseInstant('2026-03-21T12:00:00Z'),
);

const inWindowByDay = within(
  parseInstant('2026-03-22T04:59:00Z'),
  parseInstant('2026-03-21T06:00:00Z'),
  parseInstant('2026-03-22T03:00:00Z'),
  { unit: 'day', tz: 'America/New_York' },
);

// clamp returns Temporal.Instant — project to a timezone as needed
const clamped = clamp(
  parseInstant('2026-03-21T13:00:00Z'),
  parseInstant('2026-03-21T10:00:00Z'),
  parseInstant('2026-03-21T12:00:00Z'),
);
const bounded = clamped.toZonedDateTimeISO('UTC');

// with unit comparison, clamp aligns to the requested unit boundary
const clampedByDay = clamp(
  parseInstant('2026-03-23T05:00:00Z'),
  parseInstant('2026-03-21T09:00:00Z'),
  parseInstant('2026-03-22T18:00:00Z'),
  { unit: 'day', tz: 'America/New_York' },
);
```

## Comparison Helpers

```ts
import { isAfter, isBefore, isSame, parseInstant } from '@vielzeug/tempo';

isBefore(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T11:00:00Z'));
isAfter(parseInstant('2026-03-21T12:00:00Z'), parseInstant('2026-03-21T11:00:00Z'));
isSame(parseInstant('2026-03-21T23:30:00Z'), parseInstant('2026-03-22T00:15:00Z'), {
  unit: 'day',
  tz: 'America/New_York',
});

isBefore(parseInstant('2026-03-21T23:30:00Z'), parseInstant('2026-03-22T00:15:00Z'), {
  unit: 'day',
  tz: 'UTC',
});
```

## Start and End Boundaries

```ts
import { endOf, parseInstant, startOf } from '@vielzeug/tempo';

const dayStart = startOf(parseInstant('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
const dayEnd = endOf(parseInstant('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });

const weekStart = startOf(parseInstant('2026-03-21T10:15:30Z'), 'week', {
  tz: 'Europe/Berlin',
  weekStartsOn: 1,
});
```

## Formatting

Use `format()` for UI, `formatInstant()`/`formatZoned()` for machine output, `formatRelative()` for UX copy.

```ts
import {
  format,
  formatInstant,
  formatParts,
  formatRange,
  formatRangeParts,
  formatRelative,
  formatZoned,
  parseInstant,
} from '@vielzeug/tempo';

const instant = parseInstant('2026-03-21T10:15:30Z');

format(instant, { pattern: 'short', locale: 'en-GB', tz: 'UTC' });
formatInstant(instant);
formatZoned(instant, { tz: 'Europe/Berlin' });

formatRange(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T12:00:00Z'), {
  pattern: 'short',
  locale: 'en-US',
  tz: 'America/New_York',
});

formatRelative(parseInstant('2026-03-21T12:00:00Z'), {
  base: parseInstant('2026-03-21T10:00:00Z'),
  locale: 'en-US',
  numeric: 'always',
});

// formatParts / formatRangeParts — raw Intl parts for custom rendering
const parts = formatParts(instant, { pattern: 'date-only', tz: 'UTC' });
// [{ type: 'month', value: '3' }, { type: 'literal', value: '/' }, ...]

const rangeParts = formatRangeParts(parseInstant('2026-03-21T10:00:00Z'), parseInstant('2026-03-21T12:00:00Z'), {
  pattern: 'short',
  locale: 'en-US',
  tz: 'UTC',
});
const startOnly = rangeParts.filter((p) => p.source === 'startRange' || p.source === 'shared');
```

## Duration Helpers

```ts
import { formatDuration, parseDuration } from '@vielzeug/tempo';

const duration = parseDuration('PT2H30M');
const text = formatDuration(duration, { locale: 'en-US', style: 'short' });
```

> **Note:** `formatDuration()` uses `Intl.DurationFormat` when available. In environments that do not support it, it falls back to a plain **English-only** representation (e.g., `'2 hours, 30 minutes'`).

## Expiry and Classification

Use `expires()` to classify a date into a named threshold bucket of your choosing.

```ts
import { classify, expires, humanize, now, parseInstant, parseZoned, shift, timeDiff } from '@vielzeug/tempo';

const THRESHOLDS = {
  longExpired: { days: -30 }, // more than 30 days past
  expired: { days: 0 }, // any past date
  critical: { days: 3 }, // within 3 days
  warning: { days: 14 }, // within 14 days
  safe: { years: 100 },
} as const;

// Use shift(now(tz), ...) for day-level offsets
expires(shift(now('UTC'), { days: -60 }).toInstant(), THRESHOLDS); // 'longExpired'
expires(shift(now('UTC'), { hours: 48 }).toInstant(), THRESHOLDS); // 'critical'
expires(shift(now('UTC'), { years: 200 }).toInstant(), THRESHOLDS); // null (no match)

// classify() = expires() + timeDiff() in one call
const { key, diff } = classify(certificateExpiry, THRESHOLDS);
// key: 'critical' | 'expired' | 'warning' | 'safe' | 'longExpired' | null
// diff: { unit: 'hour' | 'day' | ..., value: number }

// Pin the reference time for deterministic behavior in tests
const pinnedNow = parseInstant('2026-06-01T00:00:00Z');
expires(parseInstant('2026-06-04T00:00:00Z'), THRESHOLDS, {}, pinnedNow); // 'critical'

// timeDiff — largest-unit human-readable time difference
// No tz needed when both are Instants
timeDiff(parseInstant('2026-01-01T00:00:00Z'), parseInstant('2027-06-01T00:00:00Z')); // { unit: 'year', value: 1 }

// humanize converts a TimeDiffResult to a readable string (English only)
humanize(timeDiff(expiresAt)); // '3 days', '1 hour', etc.
```

## Date Ranges and Recurrence

Use `dateRange()` to lazily generate sequences of `ZonedDateTime` values for calendars, reports, or iteration.

When `start` is a `ZonedDateTime`, the timezone is inferred automatically — no need to pass `options`. For plain inputs, pass `options.tz` explicitly.

```ts
import { dateRange, parseZoned, recurrence } from '@vielzeug/tempo';

// dateRange returns a Generator — use for...of or spread to collect
const start = parseZoned('2026-03-01T00:00:00[UTC]');
const end = parseZoned('2026-03-31T00:00:00[UTC]');

// ZonedDateTime inputs — tz inferred, no options needed
for (const day of dateRange(start, end, { days: 1 })) {
  render(day);
}

// Collect to array
const days = [...dateRange(start, end, { days: 1 })];

// Every Monday in a date range
const mondays = [
  ...dateRange(
    parseZoned('2026-03-02T00:00:00[UTC]'),
    parseZoned('2026-03-30T00:00:00[UTC]'),
    { weeks: 1 },
  ),
];

// recurrence — repeating dates with count or until
const meetingStart = parseZoned('2026-01-05T09:00:00[Europe/Berlin]');
const deadline = parseZoned('2026-06-30T00:00:00[Europe/Berlin]');

// ZonedDateTime start — tz inferred, no options needed
for (const meeting of recurrence(meetingStart, { frequency: 'weekly', until: deadline })) {
  schedule(meeting);
}

// Every 3 months for 6 occurrences (tz inferred from ZonedDateTime start)
const quarters = [...recurrence(meetingStart, { frequency: 'monthly', interval: 3, count: 6 })];
```

## Framework Integration

Tempo is a pure-utility library with no subscription model. Use its functions directly wherever date/time values are formatted or computed.

::: code-group

```tsx [React]
import { format, now, parseInstant, shift } from '@vielzeug/tempo';

function DeadlineLabel({ iso }: { iso: string }) {
  const deadline = parseInstant(iso);
  const tomorrow = shift(now('UTC'), { days: 1 });
  const isUrgent = deadline.epochMilliseconds < tomorrow.toInstant().epochMilliseconds;

  return <span className={isUrgent ? 'urgent' : ''}>{format(deadline, { locale: navigator.language })}</span>;
}
```

```ts [Vue 3]
import { computed } from 'vue';
import { format, now, parseInstant, shift } from '@vielzeug/tempo';

function useDeadlineLabel(iso: string) {
  return computed(() => {
    const deadline = parseInstant(iso);
    const tomorrow = shift(now('UTC'), { days: 1 });
    const isUrgent = deadline.epochMilliseconds < tomorrow.toInstant().epochMilliseconds;
    return { label: format(deadline, { locale: 'en' }), isUrgent };
  });
}
```

```svelte [Svelte]
<script lang="ts">
  import { format, now, parseInstant, shift } from '@vielzeug/tempo';

  export let iso: string;

  $: deadline = parseInstant(iso);
  $: isUrgent = deadline.epochMilliseconds < shift(now('UTC'), { days: 1 }).toInstant().epochMilliseconds;
  $: label = format(deadline, { locale: 'en' });
</script>

<span class:urgent={isUrgent}>{label}</span>
```

:::

## Working with Other Vielzeug Libraries

### With Rune

Format timestamps for structured log output using Tempo.

```ts
import { createLogger } from '@vielzeug/rune';
import { formatInstant, now } from '@vielzeug/tempo';

const log = createLogger({ namespace: 'app' });

log.info({ timestamp: formatInstant(now('UTC')) }, 'server started');
```

### With Vault

Use TTL values derived from Tempo duration helpers.

```ts
import { createLocalStorage, table, ttl } from '@vielzeug/vault';
import { shift, now } from '@vielzeug/tempo';

type Session = { id: string; token: string };
const schema = { sessions: table<Session>('id') };
const db = createLocalStorage('app', schema);

// Store session with a 1-hour TTL
const expiresIn = shift(now('UTC'), { hours: 1 }).toInstant().epochMilliseconds - Date.now();
await db.put('sessions', { id: '1', token: 'abc' }, ttl.ms(expiresIn));
```

## Best Practices

- Store `Temporal.Instant` values in databases and APIs — never store offset-aware strings.
- Use `parsePlainDateTime()` at the system boundary when receiving wall-clock strings from external sources; use `parseInstant()` for UTC ISO strings; use `parseDate()` when the format is unknown.
- Use `isValid()` as a type guard when accepting `TimeInput` from external data.
- Convert to `ZonedDateTime` only when rendering to users; keep instants everywhere else.
- Always pass `tz` when calling `toInstant()`, `shift()`, or `difference()` with plain inputs.
- Use `format()` for UI labels, `formatInstant()` for transport/logging, and `formatZoned()` for zoned ISO strings.
- Use `formatParts()` / `formatRangeParts()` when individual date parts need separate styling.
- Use `formatRelative()` for UX copy ("3 hours ago") rather than computing the difference manually.
- Prefer `dateRange()` over manual `while` loops when generating sequences of dates.
