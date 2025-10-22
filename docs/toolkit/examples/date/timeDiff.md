# timeDiff

Calculates the remaining time until a target date, returning the value and its unit (e.g., days, months, years).

## API

```ts
timeDiff(
  date: Date | string,
  direction?: 'FUTURE' | 'PAST',
  allowedUnits?: ('YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR' | 'MINUTE' | 'SECOND')[]
): {
  value: number;
  unit: 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR' | 'MINUTE' | 'SECOND' | 'INVALID_DATE';
}
```

- `date`: The target date (Date object or ISO string).
- `direction`: 'FUTURE' or 'PAST' (default: 'FUTURE').
- `allowedUnits`: Optional array of units to filter the result.

### Returns

- An object containing the remaining time and its unit.

## Example

```ts
import { timeDiff } from '@vielzeug/toolkit';

timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 5)); // { value: 5, unit: 'DAY' }
timeDiff(new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), 'PAST'); // { value: 3, unit: 'DAY' }
timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 31)); // { value: 1, unit: 'MONTH' }
timeDiff(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)); // { value: 1, unit: 'YEAR' }
timeDiff('invalid-date'); // { value: 0, unit: 'INVALID_DATE' }
```

## Notes

- Returns `{ value: 0, unit: 'INVALID_DATE' }` for invalid dates.
- Useful for countdowns, reminders, or time-based logic.
