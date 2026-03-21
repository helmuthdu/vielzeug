---
title: Timezone Conversion
description: Converting times between different timezones with Timit.
---

# Timezone Conversion

Converting a time from one timezone to another while preserving the exact moment in time.

## Basic Conversion

```ts
import { d } from '@vielzeug/timit';

const utc = '2026-03-21T10:15:30Z';

const tokyo = d.asZoned(utc, { tz: 'Asia/Tokyo' });
const london = d.asZoned(utc, { tz: 'Europe/London' });
const newyork = d.asZoned(utc, { tz: 'America/New_York' });

console.log(tokyo.hour);   // 19 (7:15 PM JST)
console.log(london.hour);  // 10 (10:15 AM GMT)
console.log(newyork.hour); // 5  (5:15 AM EDT)
```

All three represent the **exact same moment** in time, just displayed differently.

## Display in Multiple Timezones

```ts
const event = '2026-04-15T14:00:00Z';

const timezones = [
  'America/New_York',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
];

for (const tz of timezones) {
  const local = d.asZoned(event, { tz });
  const formatted = d.format(local, { pattern: 'long', tz });
  console.log(`${tz.padEnd(20)} ${formatted}`);
}
```

## Getting Current Time in a Timezone

```ts
const now = d.now();           // Current time in system timezone
const londonNow = d.now('Europe/London');
const tokyoNow = d.now('Asia/Tokyo');

console.log(d.format(now, { pattern: 'short' }));
console.log(d.format(londonNow, { pattern: 'short' }));
console.log(d.format(tokyoNow, { pattern: 'short' }));
```

