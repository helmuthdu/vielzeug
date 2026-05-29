---
title: Tempo - Usage Guide
description: Parsing, timezone conversion, arithmetic, boundaries, and formatting with Tempo.
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
} from '@vielzeug/tempo';
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

Use `formatHuman()` for UI, `formatInstant()`/`formatZoned()` for machine output, `formatRelative()` for UX copy.

```ts
import { formatHuman, formatInstant, formatRange, formatRelative, formatZoned } from '@vielzeug/tempo';

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
import { formatDuration, parseDuration } from '@vielzeug/tempo';

const duration = parseDuration('PT2H30M');
const text = formatDuration(duration, { locale: 'en-US', style: 'short' });
```

## Framework Integration

Tempo is a pure-utility library with no subscription model. Use its functions directly wherever date/time values are formatted or computed.

::: code-group

```tsx [React]
import { formatHuman, now, shift } from '@vielzeug/tempo';

function DeadlineLabel({ iso }: { iso: string }) {
  const deadline = Temporal.Instant.from(iso);
  const tomorrow = shift(now('UTC'), { days: 1 });
  const isUrgent = deadline.epochMilliseconds < tomorrow.toInstant().epochMilliseconds;

  return (
    <span className={isUrgent ? 'urgent' : ''}>
      {formatHuman(deadline, { locale: navigator.language })}
    </span>
  );
}
```

```ts [Vue 3]
import { computed } from 'vue';
import { formatHuman, now, shift } from '@vielzeug/tempo';

function useDeadlineLabel(iso: string) {
  return computed(() => {
    const deadline = Temporal.Instant.from(iso);
    const tomorrow = shift(now('UTC'), { days: 1 });
    const isUrgent = deadline.epochMilliseconds < tomorrow.toInstant().epochMilliseconds;
    return { label: formatHuman(deadline, { locale: 'en' }), isUrgent };
  });
}
```

```svelte [Svelte]
<script lang="ts">
  import { formatHuman, now, shift } from '@vielzeug/tempo';

  export let iso: string;

  $: deadline = Temporal.Instant.from(iso);
  $: isUrgent = deadline.epochMilliseconds < shift(now('UTC'), { days: 1 }).toInstant().epochMilliseconds;
  $: label = formatHuman(deadline, { locale: 'en' });
</script>

<span class:urgent={isUrgent}>{label}</span>
```

:::

### Pitfalls

- **React:** The `setInterval` callback captures `timestamp` by closure — if `timestamp` changes, the old interval still runs with the old value. Always include `timestamp` in the `useEffect` dependency array and clear the old interval.
- **Vue 3:** `formatHuman` is not reactive on its own — wrap it in `computed()` so it re-runs when the `timestamp` prop changes.
- **Svelte:** The `setInterval` created at the top level of `<script>` starts immediately on component initialization, not on mount — this is fine but means `clearInterval` in `onDestroy` is critical.

## Working with Other Vielzeug Libraries

### With Rune

Format timestamps for structured log output using Tempo.

```ts
import { createLogger } from '@vielzeug/rune';
import { formatInstant, now } from '@vielzeug/tempo';

const log = createLogger({ namespace: 'app' });

log.info({ timestamp: formatInstant(now('UTC')) }, 'server started');
```

### With Deposit

Use TTL values derived from Tempo duration helpers.

```ts
import { createLocalStorage, table, ttl } from '@vielzeug/deposit';
import { shift, now } from '@vielzeug/tempo';

type Session = { id: string; token: string };
const schema = { sessions: table<Session>('id') };
const db = createLocalStorage('app', schema);

// Store session with a 1-hour TTL
const expiresIn = shift(now('UTC'), { hours: 1 }).toInstant().epochMilliseconds - Date.now();
await db.put('sessions', { id: '1', token: 'abc' }, ttl.ms(expiresIn));
```

## Best Practices

- Store instants (`Temporal.Instant`) in persistence and APIs.
- Use Temporal constructors (`Temporal.Instant.from`, `Temporal.ZonedDateTime.from`) at system boundaries.
- Convert to zoned values only for user-facing rendering.
- Pass `tz` whenever converting local wall-clock values.
- Use `formatHuman` for UI, `formatInstant` for transport/logging, and `formatZoned` for zoned ISO strings.
