---
title: Tempo — Usage Guide
description: Parse explicit Temporal values, resolve wall-clock time, perform timezone-aware arithmetic, and format dates with Tempo.
---

[[toc]]

## Basic Usage

Parse ISO input with a declared target. Convert plain values with `timeZone` before treating them as an instant.

```ts
import { format, parse, shift } from '@vielzeug/tempo';

const local = parse('2026-03-21T10:15:30', { as: 'plainDateTime' });
const reminder = shift(local, { minutes: -15 }, { timeZone: 'America/New_York' });

format(reminder, { locale: 'en-US', pattern: 'short' });
```

## Parse ISO Values

Choose the value your boundary actually represents. Tempo does not auto-detect ISO strings.

```ts
import { parse } from '@vielzeug/tempo';

const occurredAt = parse('2026-03-21T10:15:30Z', { as: 'instant' });
const meeting = parse('2026-03-21T10:15:30+01:00[Europe/Berlin]', { as: 'zonedDateTime' });
const localStart = parse('2026-03-21T10:15:30', { as: 'plainDateTime' });
const birthday = parse('2026-03-21', { as: 'plainDate' });
```

## Convert Timezones

Use `inTimeZone()` to project an absolute value. Use `toInstant()` only when resolving a wall-clock value.

```ts
import { inTimeZone, parse, toInstant } from '@vielzeug/tempo';

const local = parse('2026-11-01T01:30:00', { as: 'plainDateTime' });
const firstOccurrence = toInstant(local, {
  disambiguation: 'earlier',
  timeZone: 'America/New_York',
});

const berlin = inTimeZone(firstOccurrence, 'Europe/Berlin');
```

## Calculate and Compare

Use Tempo helpers when an operation must resolve timezones, normalize ranges, or compare calendar units. Use Temporal methods directly when values are already the exact kind and timezone you need.

```ts
import { clamp, contains, difference, parse, shift } from '@vielzeug/tempo';

const start = parse('2026-03-21T10:00:00Z', { as: 'instant' });
const end = parse('2026-03-21T12:00:00Z', { as: 'instant' });
const value = parse('2026-03-21T13:00:00Z', { as: 'instant' });

const duration = difference({ end, largestUnit: 'hour', start });
const isScheduled = contains({ end, start, value });
const bounded = clamp({ end, start, value });

const local = parse('2026-03-08T01:30:00', { as: 'plainDateTime' });
const tomorrow = shift(local, { days: 1 }, { timeZone: 'America/New_York' });
```

## Classify Expiry

Use fixed elapsed-time thresholds in milliseconds or larger units. Handle `null` as the unclassified state instead of adding a far-future catch-all.

```ts
import { classifyExpiry, parse } from '@vielzeug/tempo';

const status = classifyExpiry({
  relativeTo: parse('2026-06-01T00:00:00Z', { as: 'instant' }),
  thresholds: {
    expired: { days: 0 },
    critical: { days: 3 },
    warning: { days: 14 },
  },
  value: parse('2026-06-04T00:00:00Z', { as: 'instant' }),
});

const label = status ?? 'safe';
```

## Format Values

Use `format()` for UI, `formatInstant()` for transport, and `formatZoned()` for a zoned ISO string.

```ts
import { format, formatInstant, formatRelative, formatZoned, parse } from '@vielzeug/tempo';

const instant = parse('2026-03-21T10:15:30Z', { as: 'instant' });

format(instant, { locale: 'en-GB', pattern: 'short', timeZone: 'UTC' });
formatInstant(instant);
formatZoned(instant, { timeZone: 'Europe/Berlin' });
formatRelative(instant, { base: parse('2026-03-21T09:15:30Z', { as: 'instant' }) });
```

`formatRelative()` uses fixed elapsed-time units for short spans and complete calendar months or years for longer spans. Pass `timeZone` when calendar-relative output must use a specific regional calendar boundary.

## Generate Calendar Sequences

Use zoned values when the sequence already has a timezone. Plain and instant starts require `timeZone`.

```ts
import { dateRange, parse, recurrence } from '@vielzeug/tempo';

const start = parse('2026-03-01T09:00:00[America/New_York]', { as: 'zonedDateTime' });
const end = parse('2026-03-03T09:00:00[America/New_York]', { as: 'zonedDateTime' });

const days = [...dateRange(start, end, { days: 1 })];
const meetings = [...recurrence(start, { count: 4, frequency: 'weekly', interval: 2 })];
```

Both functions advance with zoned calendar arithmetic. Non-advancing range steps, invalid recurrence intervals, and negative or fractional counts throw `TempoInvalidInputError`.

## Testing

Pin the reference instant for deterministic expiry tests.

```ts
import { classifyExpiry, parse } from '@vielzeug/tempo';

const relativeTo = parse('2026-06-01T00:00:00Z', { as: 'instant' });
const value = parse('2026-05-31T00:00:00Z', { as: 'instant' });

classifyExpiry({ relativeTo, thresholds: { expired: { days: 0 } }, value });
```

## Framework Integration

Pass ISO strings through component props. Parse and format at the rendering boundary.

::: code-group

```tsx [React]
import { format, parse } from '@vielzeug/tempo';

const label = format(parse(iso, { as: 'instant' }), { locale: 'en-US', pattern: 'medium', timeZone: 'UTC' });
```

```vue [Vue 3]
<script setup lang="ts">
import { format, parse } from '@vielzeug/tempo';

const props = defineProps<{ iso: string }>();
const label = format(parse(props.iso, { as: 'instant' }), { locale: 'en-US', pattern: 'medium', timeZone: 'UTC' });
</script>
```

```svelte [Svelte]
<script lang="ts">
  import { format, parse } from '@vielzeug/tempo';
  export let iso: string;
  $: label = format(parse(iso, { as: 'instant' }), { locale: 'en-US', pattern: 'medium', timeZone: 'UTC' });
</script>
```

:::

## Working with Other Vielzeug Libraries

### With Rune

Write stable UTC timestamps to structured logs.

```ts
import { formatInstant, nowInstant } from '@vielzeug/tempo';

logger.info({ timestamp: formatInstant(nowInstant()) }, 'server started');
```

### With Vault

Calculate an explicit instant before storing an expiring record.

```ts
import { now } from '@vielzeug/tempo';

const expiresAt = now({ timeZone: 'UTC' }).add({ minutes: 30 }).toInstant();
```

## Best Practices

- Parse strings with their actual temporal meaning and pass `timeZone` when resolving plain values.
- Use `disambiguation` for DST overlap and gap handling.
- Use Tempo helpers for timezone resolution, normalized ranges, and calendar units; use Temporal directly for already-normalized values.
- Use fixed duration units for expiry thresholds.
- Reject non-advancing range and recurrence configuration.
- Store instants for transport and database values.
- Use `formatInstant()` for machine output and `format()` for user-facing text.
- Pass `timeZone` to `formatRelative()` when month and year boundaries must use a specific region.
