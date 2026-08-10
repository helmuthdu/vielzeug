---
title: Tempo — Usage Guide
description: Parse explicit Temporal values, resolve wall-clock time, compare ranges, and format dates with Tempo.
---

[[toc]]

## Basic Usage

Parse ISO input with a declared target. Convert plain values with `timeZone` before treating them as an instant.

```ts
import { format, inTimeZone, parse, shift, toInstant } from '@vielzeug/tempo';

const local = parse('2026-03-21T10:15:30', { as: 'plainDateTime' });
const instant = toInstant(local, { timeZone: 'America/New_York' });
const reminder = shift(instant, { minutes: -15 }, { timeZone: 'America/New_York' });

format(inTimeZone(reminder, 'America/New_York'), { locale: 'en-US', pattern: 'short' });
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

Use object inputs for operations with multiple time values.

```ts
import { clamp, contains, difference, parse } from '@vielzeug/tempo';

const start = parse('2026-03-21T10:00:00Z', { as: 'instant' });
const end = parse('2026-03-21T12:00:00Z', { as: 'instant' });
const value = parse('2026-03-21T13:00:00Z', { as: 'instant' });

const duration = difference({ end, largestUnit: 'hour', start });
const isScheduled = contains({ end, start, value });
const bounded = clamp({ end, start, value });
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

## Generate Calendar Sequences

Use zoned inputs for date sequences so the timezone is inferred.

```ts
import { dateRange, parse, recurrence } from '@vielzeug/tempo';

const start = parse('2026-03-01T00:00:00[UTC]', { as: 'zonedDateTime' });
const end = parse('2026-03-31T00:00:00[UTC]', { as: 'zonedDateTime' });

const days = [...dateRange(start, end, { days: 1 })];
const meetings = [...recurrence(start, { count: 4, frequency: 'weekly' })];
```

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
import { now, shift } from '@vielzeug/tempo';

const expiresAt = shift(now({ timeZone: 'UTC' }), { minutes: 30 }).toInstant();
```

## Best Practices

- Parse each string with its actual temporal meaning.
- Pass `timeZone` when converting a plain date or plain date-time.
- Use `disambiguation` for DST overlap and gap handling.
- Pass named fields to `difference()`, `contains()`, `clamp()`, and `classifyExpiry()`.
- Use fixed duration units for expiry thresholds.
- Store instants for transport and database values.
- Use `formatInstant()` for machine output and `format()` for user-facing text.
