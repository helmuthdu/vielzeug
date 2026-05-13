---
title: Timezone Conversion
description: Converting times between different timezones with Timit.
---

Converting a time from one timezone to another while preserving the exact moment in time.

## Basic Conversion

```ts
import { formatHuman, now, toZoned } from '@vielzeug/timit';

const utc = Temporal.Instant.from('2026-03-21T10:15:30Z');

const tokyo = toZoned(utc, { tz: 'Asia/Tokyo' });
const london = toZoned(utc, { tz: 'Europe/London' });
const newyork = toZoned(utc, { tz: 'America/New_York' });

console.log(tokyo.hour); // 19 (7:15 PM JST)
console.log(london.hour); // 10 (10:15 AM GMT)
console.log(newyork.hour); // 5  (5:15 AM EDT)
```

All three represent the **exact same moment** in time, just displayed differently.

## Display in Multiple Timezones

```ts
const event = Temporal.Instant.from('2026-04-15T14:00:00Z');

const timezones = ['America/New_York', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'];

for (const tz of timezones) {
  const local = toZoned(event, { tz });
  const formatted = formatHuman(local, { pattern: 'long', tz });
  console.log(`${tz.padEnd(20)} ${formatted}`);
}
```

## Getting Current Time in a Timezone

```ts
const current = now('UTC');
const londonNow = now('Europe/London');
const tokyoNow = now('Asia/Tokyo');

console.log(formatHuman(current, { pattern: 'short', tz: 'UTC' }));
console.log(formatHuman(londonNow, { pattern: 'short', tz: 'Europe/London' }));
console.log(formatHuman(tokyoNow, { pattern: 'short', tz: 'Asia/Tokyo' }));
```
