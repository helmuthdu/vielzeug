---
title: Toolkit — Date Examples
description: Date utility examples for Toolkit.
---

# Date Utilities

Date utilities provide a set of helpers to work with dates and times in a type-safe, ergonomic way. Use these tools for checking expiration, generating date ranges, and finding precise time differences without the weight of large date libraries.

## 📚 Quick Reference

| Method                           | Description                                                       |
| :------------------------------- | :---------------------------------------------------------------- |
| [`expires`](./date/expires.md)   | Check if a given date or timestamp has already passed.            |
| [`interval`](./date/interval.md) | Generate an array of dates between two dates at a given interval. |
| [`timeDiff`](./date/timeDiff.md) | Get the most significant time difference between two dates.       |

## 💡 Practical Examples

### Expiration Checks

```ts
import { expires } from '@vielzeug/toolkit';

// Check if a token is still valid
const tokenExpiry = '2026-01-01T00:00:00Z';
if (expires(tokenExpiry)) {
  console.log('Token has expired');
}
```

### Generating Date Ranges with `interval`

The `interval` function accepts a string interval code:

| Code           | Description                                 |
| -------------- | ------------------------------------------- |
| `'day'`        | Increment by one calendar day               |
| `'week'`       | Increment by 7 days                         |
| `'month'`      | Increment by one month (same day)           |
| `'monthStart'` | Increment to the 1st of the next month      |
| `'monthEnd'`   | Increment to the last day of the next month |
| `'year'`       | Increment by one year (same month/day)      |
| `'yearStart'`  | Increment to January 1 of the next year     |
| `'yearEnd'`    | Increment to December 31 of the next year   |

```ts
import { interval } from '@vielzeug/toolkit';

// Every day in January
const days = interval('2024-01-01', '2024-01-05', { interval: 'day' });
// [2024-01-01, 2024-01-02, 2024-01-03, 2024-01-04, 2024-01-05]

// Every Monday in Q1
const weeks = interval('2024-01-01', '2024-03-31', { interval: 'week' });

// First day of each month in 2024
const months = interval('2024-01-01', '2024-12-31', { interval: 'monthStart' });
```

### Time Differences with `timeDiff`

`timeDiff` returns `{ value: number; unit: TimeUnit } | undefined`. It returns `undefined` when either date is invalid. The `unit` is one of: `'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR' | 'MINUTE' | 'SECOND'`.

```ts
import { timeDiff } from '@vielzeug/toolkit';

const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5);
const diff = timeDiff(past); // { value: 5, unit: 'DAY' }

// Filter to specific units only
const minuteOrSecond = timeDiff(past, new Date(), ['MINUTE', 'SECOND']);

// Invalid input returns undefined
const invalid = timeDiff('not-a-date'); // undefined
```

## 🔗 All Date Utilities

<div class="grid-links">

- [expires](./date/expires.md)
- [interval](./date/interval.md)
- [timeDiff](./date/timeDiff.md)

</div>

Date utilities provide a set of helpers to work with dates and times in a type-safe, ergonomic way. Use these tools for checking expiration, calculating intervals, and finding precise time differences without the weight of large date libraries.

## 📚 Quick Reference

| Method                           | Description                                                       |
| :------------------------------- | :---------------------------------------------------------------- |
| [`expires`](./date/expires.md)   | Check if a given date or timestamp has already passed.            |
| [`interval`](./date/interval.md) | Calculate the duration between two dates in human-readable units. |
| [`timeDiff`](./date/timeDiff.md) | Get the raw difference between two dates in specific units.       |

## 💡 Practical Examples

### Expiration Checks

```ts
import { expires } from '@vielzeug/toolkit';

// Check if a token is still valid
const tokenExpiry = '2026-01-01T00:00:00Z';
if (expires(tokenExpiry)) {
  console.log('Token has expired');
}
```

### Intervals & Durations

```ts
import { interval, timeDiff } from '@vielzeug/toolkit';

const start = new Date('2024-01-01');
const end = new Date('2024-01-02 12:30:00');

// Detailed interval breakdown
const duration = interval(start, end);
// { days: 1, hours: 12, minutes: 30, seconds: 0 }

// Specific difference
const diffInDays = timeDiff(start, end, ['days']); // "1 day"
```

## 🔗 All Date Utilities

<div class="grid-links">

- [expires](./date/expires.md)
- [interval](./date/interval.md)
- [timeDiff](./date/timeDiff.md)

</div>
