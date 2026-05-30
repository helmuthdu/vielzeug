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

Use `parseLocal()` for wall-clock strings.
Use `toInstant()` for timeline-safe values.
Use `toZoned()` for display in a specific timezone.

```ts
import { parseLocal, toInstant, toZoned } from '@vielzeug/tempo';

const local = parseLocal('2026-03-21T10:15:30');
const instant = toInstant(local, { tz: 'Europe/Berlin' });
const tokyo = toZoned(instant, { tz: 'Asia/Tokyo' });
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
import { format, formatInstant, formatRange, formatRelative, formatZoned } from '@vielzeug/tempo';

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
```

## Duration Helpers

```ts
import { formatDuration, parseDuration } from '@vielzeug/tempo';

const duration = parseDuration('PT2H30M');
const text = formatDuration(duration, { locale: 'en-US', style: 'short' });
```

## Expiry and Time-Difference Utilities

Use `expires()` to classify whether a date has passed, is approaching, or is far away.

```ts
import { expires, timeDiff } from '@vielzeug/tempo';

// Classify a date against a look-ahead window (default: 7 days)
expires(Temporal.Now.instant());                        // 'EXPIRED'
expires(Temporal.Now.instant().add({ hours: 48 }));     // 'SOON'
expires(Temporal.Now.instant().add({ hours: 48 }), 1); // 'LATER'
expires(Temporal.Instant.from('9999-12-31T00:00:00Z')); // 'NEVER'

// Largest-unit human-readable time difference
timeDiff(
  Temporal.Instant.from('2026-01-01T00:00:00Z'),
  Temporal.Instant.from('2027-06-01T00:00:00Z'),
); // { unit: 'year', value: 1 }
```

## Date Ranges

Use `dateRange()` to generate sequences of `ZonedDateTime` values for calendars, reports, or iteration.

```ts
import { dateRange } from '@vielzeug/tempo';

// Every day in March 2026
const days = dateRange(
  Temporal.ZonedDateTime.from('2026-03-01T00:00:00[UTC]'),
  Temporal.ZonedDateTime.from('2026-03-31T00:00:00[UTC]'),
  { days: 1 },
  { tz: 'UTC' },
);

// Every Monday in a date range
const mondays = dateRange(
  Temporal.ZonedDateTime.from('2026-03-02T00:00:00[UTC]'),
  Temporal.ZonedDateTime.from('2026-03-30T00:00:00[UTC]'),
  { weeks: 1 },
  { tz: 'UTC' },
);
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
- Use `parseLocal()` at the system boundary when receiving wall-clock strings from external sources.
- Convert to `ZonedDateTime` only when rendering to users; keep instants everywhere else.
- Always pass `tz` when calling `toInstant()`, `shift()`, or `difference()` with plain inputs.
- Use `format()` for UI labels, `formatInstant()` for transport/logging, and `formatZoned()` for zoned ISO strings.
- Use `formatRelative()` for UX copy ("3 hours ago") rather than computing the difference manually.
- Call `clearCaches()` in test `afterEach` hooks when tests depend on specific `Intl` formatter behavior.
- Prefer `dateRange()` over manual `while` loops when generating sequences of dates.
