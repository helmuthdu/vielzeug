---
title: Tempo — Usage Guide
description: Parsing, timezone conversion, arithmetic, boundaries, and formatting with Tempo.
---

[[toc]]

## Basic Usage

Use named imports from `@vielzeug/tempo` for tree-shaking.

```ts
import { format, now, parseLocal, shift, toInstant, toZoned } from '@vielzeug/tempo';

// Current time in a timezone
const berlin = now('Europe/Berlin');

// Parse a wall-clock string, then pin it to a timezone
const local = parseLocal('2026-03-21T10:15:30');
const instant = toInstant(local, { tz: 'America/New_York' });

// Format for display
format(instant, { pattern: 'short', locale: 'en-US', tz: 'America/New_York' });
```

## Parsing and Conversion

Use `parseLocal()` for wall-clock strings, `parseInstant()` for UTC ISO strings, and `parseAny()` when the input format varies. Use `toInstant()` and `toZoned()` to project values across timezones.

```ts
import { isValid, parseAny, parseInstant, parseLocal, toInstant, toZoned } from '@vielzeug/tempo';

// Wall-clock string from user input or database
const local = parseLocal('2026-03-21T10:15:30');
const instant = toInstant(local, { tz: 'Europe/Berlin' });
const tokyo = toZoned(instant, { tz: 'Asia/Tokyo' });

// UTC ISO string from an API response
const ts = parseInstant('2026-03-21T10:15:30Z');

// Unknown ISO format — picks the most specific type automatically
parseAny('2026-03-21T11:00:00+01:00[Europe/Berlin]'); // ZonedDateTime
parseAny('2026-03-21T10:00:00Z');                     // Instant
parseAny('2026-03-21T10:00:00');                      // PlainDateTime
parseAny('2026-03-21');                               // PlainDate

// Type guard — validate before passing to Tempo functions
if (isValid(externalValue)) {
  format(externalValue, { pattern: 'short', tz: 'UTC' });
}
```

## DST-Safe Arithmetic

`shift()` handles DST transitions correctly.

```ts
import { shift } from '@vielzeug/tempo';

const before = Temporal.ZonedDateTime.from('2026-03-08T01:30:00-05:00[America/New_York]');
const after = shift(before, { hours: 1 });

console.log(after.toString());
// 2026-03-08T03:30:00-04:00[America/New_York]
```

## Difference and Range Tools

```ts
import { clamp, difference, within } from '@vielzeug/tempo';

const duration = difference(
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:30:00Z'),
  {
    tz: 'UTC',
    largestUnit: 'hour',
    smallestUnit: 'minute',
  },
);

const inWindow = within(
  Temporal.Instant.from('2026-03-21T11:00:00Z'),
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:00:00Z'),
);

const inWindowByDay = within(
  Temporal.Instant.from('2026-03-22T04:59:00Z'),
  Temporal.Instant.from('2026-03-21T06:00:00Z'),
  Temporal.Instant.from('2026-03-22T03:00:00Z'),
  { unit: 'day', tz: 'America/New_York' },
);

// clamp returns Temporal.Instant — project to a timezone as needed
const clamped = clamp(
  Temporal.Instant.from('2026-03-21T13:00:00Z'),
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:00:00Z'),
);
const bounded = clamped.toZonedDateTimeISO('UTC');

// with unit comparison, clamp aligns to the requested unit boundary
const clampedByDay = clamp(
  Temporal.Instant.from('2026-03-23T05:00:00Z'),
  Temporal.Instant.from('2026-03-21T09:00:00Z'),
  Temporal.Instant.from('2026-03-22T18:00:00Z'),
  { unit: 'day', tz: 'America/New_York' },
);
```

## Comparison Helpers

```ts
import { isAfter, isBefore, isSame } from '@vielzeug/tempo';

isBefore(Temporal.Instant.from('2026-03-21T10:00:00Z'), Temporal.Instant.from('2026-03-21T11:00:00Z'));
isAfter(Temporal.Instant.from('2026-03-21T12:00:00Z'), Temporal.Instant.from('2026-03-21T11:00:00Z'));
isSame(Temporal.Instant.from('2026-03-21T23:30:00Z'), Temporal.Instant.from('2026-03-22T00:15:00Z'), {
  unit: 'day',
  tz: 'America/New_York',
});

isBefore(Temporal.Instant.from('2026-03-21T23:30:00Z'), Temporal.Instant.from('2026-03-22T00:15:00Z'), {
  unit: 'day',
  tz: 'UTC',
});
```

## Start and End Boundaries

```ts
import { endOf, startOf } from '@vielzeug/tempo';

const dayStart = startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });
const dayEnd = endOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'day', { tz: 'UTC' });

const weekStart = startOf(Temporal.Instant.from('2026-03-21T10:15:30Z'), 'week', {
  tz: 'Europe/Berlin',
  weekStartsOn: 1,
});
```

## Formatting

Use `format()` for UI, `formatInstant()`/`formatZoned()` for machine output, `formatRelative()` for UX copy.

```ts
import { format, formatInstant, formatParts, formatRange, formatRangeParts, formatRelative, formatZoned } from '@vielzeug/tempo';

const instant = Temporal.Instant.from('2026-03-21T10:15:30Z');

format(instant, { pattern: 'short', locale: 'en-GB', tz: 'UTC' });
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

// formatParts / formatRangeParts — raw Intl parts for custom rendering
const parts = formatParts(instant, { pattern: 'date-only', tz: 'UTC' });
// [{ type: 'month', value: '3' }, { type: 'literal', value: '/' }, ...]

const rangeParts = formatRangeParts(
  Temporal.Instant.from('2026-03-21T10:00:00Z'),
  Temporal.Instant.from('2026-03-21T12:00:00Z'),
  { pattern: 'short', locale: 'en-US', tz: 'UTC' },
);
const startOnly = rangeParts.filter(p => p.source === 'startRange' || p.source === 'shared');
```

## Duration Helpers

```ts
import { formatDuration, parseDuration } from '@vielzeug/tempo';

const duration = parseDuration('PT2H30M');
const text = formatDuration(duration, { locale: 'en-US', style: 'short' });
```

## Expiry and Classification

Use `expires()` to classify a date into a named threshold bucket of your choosing.

```ts
import { classify, expires, humanize, timeDiff } from '@vielzeug/tempo';

const THRESHOLDS = {
  longExpired: { days: -30 }, // more than 30 days past
  expired:     { days: 0 },   // any past date
  critical:    { days: 3 },   // within 3 days
  warning:     { days: 14 },  // within 14 days
  safe:        { years: 100 },
} as const;

// Classify — returns the key of the first matching threshold, or null
expires(Temporal.Now.instant().subtract({ days: 60 }), THRESHOLDS); // 'longExpired'
expires(Temporal.Now.instant().add({ hours: 48 }), THRESHOLDS);     // 'critical'
expires(Temporal.Now.instant().add({ years: 200 }), THRESHOLDS);    // null (no match)

// classify() = expires() + timeDiff() in one call
const { key, diff } = classify(certificateExpiry, THRESHOLDS);
// key: 'critical' | 'expired' | 'warning' | 'safe' | 'longExpired' | null
// diff: { unit: 'hour' | 'day' | ..., value: number }

// timeDiff — largest-unit human-readable time difference
// No tz needed when both are Instants
timeDiff(
  Temporal.Instant.from('2026-01-01T00:00:00Z'),
  Temporal.Instant.from('2027-06-01T00:00:00Z'),
); // { unit: 'year', value: 1 }

// humanize converts a TimeDiffResult to a readable string
humanize(timeDiff(expiresAt)); // '3 days', '1 hour', etc.
```

## Date Ranges and Recurrence

Use `dateRange()` to lazily generate sequences of `ZonedDateTime` values for calendars, reports, or iteration.

```ts
import { dateRange, recurrence } from '@vielzeug/tempo';

// dateRange returns a Generator — use for...of or spread to collect
const start = Temporal.ZonedDateTime.from('2026-03-01T00:00:00[UTC]');
const end   = Temporal.ZonedDateTime.from('2026-03-31T00:00:00[UTC]');

// Lazy iteration — break early without computing all values
for (const day of dateRange(start, end, { days: 1 }, { tz: 'UTC' })) {
  render(day);
}

// Collect to array
const days = [...dateRange(start, end, { days: 1 }, { tz: 'UTC' })];

// Every Monday in a date range
const mondays = [...dateRange(
  Temporal.ZonedDateTime.from('2026-03-02T00:00:00[UTC]'),
  Temporal.ZonedDateTime.from('2026-03-30T00:00:00[UTC]'),
  { weeks: 1 },
  { tz: 'UTC' },
)];

// recurrence — repeating dates with count or until
const meetingStart = Temporal.ZonedDateTime.from('2026-01-05T09:00:00[Europe/Berlin]');
const deadline = Temporal.ZonedDateTime.from('2026-06-30T00:00:00[Europe/Berlin]');

// Weekly meetings until a deadline (count OR until required at compile time)
for (const meeting of recurrence(meetingStart, { frequency: 'weekly', until: deadline }, { tz: 'Europe/Berlin' })) {
  schedule(meeting);
}

// Every 3 months for 6 occurrences
const quarters = [...recurrence(meetingStart, { frequency: 'monthly', interval: 3, count: 6 }, { tz: 'UTC' })];
```

## Framework Integration

Tempo is a pure-utility library with no subscription model. Use its functions directly wherever date/time values are formatted or computed.

::: code-group

```tsx [React]
import { format, now, shift } from '@vielzeug/tempo';

function DeadlineLabel({ iso }: { iso: string }) {
  const deadline = Temporal.Instant.from(iso);
  const tomorrow = shift(now('UTC'), { days: 1 });
  const isUrgent = deadline.epochMilliseconds < tomorrow.toInstant().epochMilliseconds;

  return (
    <span className={isUrgent ? 'urgent' : ''}>
      {format(deadline, { locale: navigator.language })}
    </span>
  );
}
```

```ts [Vue 3]
import { computed } from 'vue';
import { format, now, shift } from '@vielzeug/tempo';

function useDeadlineLabel(iso: string) {
  return computed(() => {
    const deadline = Temporal.Instant.from(iso);
    const tomorrow = shift(now('UTC'), { days: 1 });
    const isUrgent = deadline.epochMilliseconds < tomorrow.toInstant().epochMilliseconds;
    return { label: format(deadline, { locale: 'en' }), isUrgent };
  });
}
```

```svelte [Svelte]
<script lang="ts">
  import { format, now, shift } from '@vielzeug/tempo';

  export let iso: string;

  $: deadline = Temporal.Instant.from(iso);
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
- Use `parseLocal()` at the system boundary when receiving wall-clock strings from external sources; use `parseInstant()` for UTC ISO strings; use `parseAny()` when the format is unknown.
- Use `isValid()` as a type guard when accepting `TimeInput` from external data.
- Convert to `ZonedDateTime` only when rendering to users; keep instants everywhere else.
- Always pass `tz` when calling `toInstant()`, `shift()`, or `difference()` with plain inputs.
- Use `format()` for UI labels, `formatInstant()` for transport/logging, and `formatZoned()` for zoned ISO strings.
- Use `formatParts()` / `formatRangeParts()` when individual date parts need separate styling.
- Use `formatRelative()` for UX copy ("3 hours ago") rather than computing the difference manually.
- Prefer `dateRange()` over manual `while` loops when generating sequences of dates.
