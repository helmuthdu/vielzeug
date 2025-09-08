# interval

Generates an array of dates between a start and end date, with a specified interval and step size.

## API

```ts
interval(
  start: Date | string,
  end: Date | string,
  options?: {
    interval?: 'D' | 'W' | 'M' | 'MS' | 'ME' | 'Y' | 'YS' | 'YE';
    steps?: number;
    latest?: boolean;
  }
): Date[]
```

- `start`: The start date (Date object or ISO string).
- `end`: The end date (Date object or ISO string).
- `options`: Optional object:
  - `interval`: Interval type ('D'=day, 'W'=week, 'M'=month, etc.; default: 'D').
  - `steps`: Step size (default: 1).
  - `latest`: If true, returns dates in reverse order (default: false).

### Returns

- An array of generated dates.

## Example

```ts
import { interval } from '@vielzeug/toolkit';

const options = { interval: 'D', steps: 1, latest: false };
interval('2022-01-01', '2022-01-05', options); // [2022-01-01, 2022-01-02, 2022-01-03, 2022-01-04, 2022-01-05]
interval('2022-01-01', '2022-01-31', { interval: 'W' }); // [2022-01-01, 2022-01-08, ...]
```

## Notes

- Throws `TypeError` if input dates are invalid.
- Useful for generating date ranges, schedules, or time series.
