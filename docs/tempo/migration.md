---
title: Tempo 2 Migration
description: Migrate Tempo parsing, timezone options, range APIs, and expiry classification to Tempo 2.
---

[[toc]]

## Tempo 2 Changes

Tempo 2 makes string parsing and timezone conversion explicit. It removes auto-detection and old parser-specific helpers.

Removed exports:

- `parseInstant`
- `parseZoned`
- `parsePlainDateTime`
- `parsePlainDate`
- `inTz`
- `within`
- `expires`

## Parse With a Target

```ts
// Tempo 1
const instant = parseInstant(value);
const date = parsePlainDate(value);

// Tempo 2
const instant = parse(value, { as: 'instant' });
const date = parse(value, { as: 'plainDate' });
```

## Rename Timezone Options

```ts
// Tempo 1
const instant = toInstant(local, { prefer: 'later', tz: 'America/New_York' });

// Tempo 2
const instant = toInstant(local, {
  disambiguation: 'later',
  timeZone: 'America/New_York',
});
```

`now('UTC')` becomes `now({ timeZone: 'UTC' })`. `inTz(value, zone)` becomes `inTimeZone(value, zone)`.

## Use Named Multi-Value Inputs

```ts
// Tempo 1
const duration = difference(start, end, { tz: 'UTC' });
const inside = within(value, start, end);
const bounded = clamp(value, start, end);

// Tempo 2
const duration = difference({ end, start, timeZone: 'UTC' });
const inside = contains({ end, start, value });
const bounded = clamp({ end, start, value });
```

## Classify Fixed Expiry Durations

`expires()` becomes `classifyExpiry()` and uses named input. Thresholds no longer accept months or years because those are calendar-relative and must not be approximated.

```ts
const status = classifyExpiry({
  thresholds: { expired: { days: 0 }, warning: { days: 14 } },
  value: expiresAt,
});

const label = status ?? 'safe';
```

## Temporal Export

`Temporal` remains exported from `@vielzeug/tempo`. No migration needed for advanced Temporal use.

## Narrow Errors With `instanceof`

`TempoError.is()` is removed. Use `instanceof TempoError` to narrow any tempo-originated error.

```ts
// Tempo 1
if (TempoError.is(err)) { ... }

// Tempo 2
if (err instanceof TempoError) { ... }
```
