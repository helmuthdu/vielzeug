<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-342_B-success" alt="Size">
</div>

# interval

The `interval` utility creates an array of dates between a start and end date, separated by a specified time unit (e.g., days, weeks, months). It's ideal for generating date series for calendars, charts, or timelines.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/date/interval.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Multiple Units**: Supports days, weeks, months (start/end), and years (start/end).
- **Customizable Steps**: Control the density of the generated range.
- **Directional Control**: Option to return results in reverse chronological order.

## API

```ts
type IntervalType = 'D' | 'W' | 'M' | 'MS' | 'ME' | 'Y' | 'YS' | 'YE';

interface IntervalOptions {
  interval?: IntervalType;
  steps?: number;
  latest?: boolean;
}

interface IntervalFunction {
  (start: Date | string | number, end: Date | string | number, options?: IntervalOptions): Date[];
}
```

### Parameters

- `start`: The beginning of the date range.
- `end`: The end of the date range.
- `options`: Optional configuration:
  - `interval`: The time unit ('D'=day, 'W'=week, 'M'=month, 'MS'=month start, 'ME'=month end, 'Y'=year, 'YS'=year start, 'YE'=year end; defaults to `'D'`).
  - `steps`: Number of units between each date (defaults to `1`).
  - `latest`: If `true`, returns the dates from newest to oldest (defaults to `false`).

### Returns

- An array of `Date` objects representing the generated sequence.

## Examples

### Daily Sequence

```ts
import { interval } from '@vielzeug/toolkit';

// Generate 5 consecutive days
const days = interval('2024-01-01', '2024-01-05');
// [Jan 1, Jan 2, Jan 3, Jan 4, Jan 5]
```

### Weekly Steps (Reverse)

```ts
import { interval } from '@vielzeug/toolkit';

const weeks = interval('2024-01-01', '2024-02-01', {
  interval: 'W',
  steps: 2,
  latest: true,
});
// [Jan 29, Jan 15, Jan 1]
```

## Implementation Notes

- Performance-optimized for large date ranges.
- Correctly handles leap years and different month lengths.
- Throws `TypeError` if input dates are invalid.

## See Also

- [expires](./expires.md): Check if a date has passed.
- [timeDiff](./timeDiff.md): Calculate the duration between two dates.
