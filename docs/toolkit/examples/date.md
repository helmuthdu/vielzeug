# 📅 Date Utilities

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

<style>
.grid-links ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
  list-style: none !important;
  padding: 0 !important;
}
.grid-links li {
  margin: 0 !important;
}
</style>
