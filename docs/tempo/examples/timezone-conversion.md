---
title: 'Tempo Examples — Timezone Conversion'
description: 'Timezone conversion example for @vielzeug/tempo.'
---

## Timezone Conversion

### Problem

When working with times across different timezones, you need to preserve the exact moment in time while projecting it into the user's local offset for display. Using string manipulation or UTC offset arithmetic directly is error-prone around DST and at year boundaries.

### Solution

Use `inTz()` to project a `Temporal.Instant` into any IANA timezone. Use `now()` to get the current time pre-pinned to a timezone. All values represent the same moment — only the display offset changes.

```ts
import { format, inTz, now, parseInstant } from '@vielzeug/tempo';

const utc = parseInstant('2026-03-21T10:15:30Z');

// Project the same instant into three timezones
const tokyo = inTz(utc, 'Asia/Tokyo');
const london = inTz(utc, 'Europe/London');
const newyork = inTz(utc, 'America/New_York');

tokyo.hour; // 19 (7:15 PM JST)
london.hour; // 10 (10:15 AM GMT)
newyork.hour; // 6  (6:15 AM EDT)
```

#### Display in Multiple Timezones

```ts
import { format, inTz, parseInstant } from '@vielzeug/tempo';

const event = parseInstant('2026-04-15T14:00:00Z');
const zones = ['America/New_York', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'];

for (const tz of zones) {
  const local = inTz(event, tz);
  const formatted = format(local, { pattern: 'long', tz });
  console.log(`${tz}: ${formatted}`);
}
```

#### Current Time by Timezone

```ts
const utcNow = now('UTC');
const londonNow = now('Europe/London');
const tokyoNow = now('Asia/Tokyo');

format(utcNow, { pattern: 'short', tz: 'UTC' });
format(londonNow, { pattern: 'short', tz: 'Europe/London' });
format(tokyoNow, { pattern: 'short', tz: 'Asia/Tokyo' });
```

### Pitfalls

- `inTz()` changes the displayed offset but does not shift the underlying instant. If you want to add or subtract time in a timezone, use `shift()` instead.
- IANA timezone IDs are case-sensitive (`'America/New_York'`, not `'america/new_york'`). Invalid IDs throw a `TempoInvalidTzError`.
- Relying on the abbreviated offset string (e.g., `EDT`) instead of the full IANA ID can silently select the wrong rule when a region's DST rules change.

### Related

- [DST-Safe Arithmetic](./dst-safe-arithmetic.md)
- [Locale Formatting](./locale-formatting.md)
- [API Reference — `inTz()`](/tempo/api#intz-input-tz-temporal-zoneddatetime)
