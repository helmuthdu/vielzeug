<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-284_B-success" alt="Size">
</div>

# timeDiff

The `timeDiff` utility calculates the time difference between two dates and returns it in a human-readable format (e.g., "5 days ago" or "in 2 hours"). It's perfect for displaying relative timestamps in user interfaces.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/date/timeDiff.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Smart Scaling**: Automatically selects the largest possible unit for the difference.
- **Configurable Units**: Restrict the output to specific units (e.g., only "DAY" or "HOUR").
- **Bi-directional**: Supports both future and past date comparisons.

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/date/timeDiff.ts#TimeDiffTypes
:::

```ts
function timeDiff(a: Date | string, b?: Date | string, allowedUnits?: TimeUnit[]): TimeResult;
```

### Parameters

- `date`: The target date to compare with the current time.
- `direction`: Optional. Specify if the target is in the `'FUTURE'` or `'PAST'` (defaults to `'FUTURE'`).
- `allowedUnits`: Optional. An array of units to consider for the output (defaults to all units).

### Returns

- An object containing the calculated numeric `value` and the chosen `unit`.
- Returns `{ value: 0, unit: 'INVALID_DATE' }` if the input date is malformed.

## Examples

### Future Countdown

```ts
import { timeDiff } from '@vielzeug/toolkit';

// Target is 5 days from now
timeDiff(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
// { value: 5, unit: 'DAY' }
```

### Past Comparison

```ts
import { timeDiff } from '@vielzeug/toolkit';

// Event happened 3 hours ago
timeDiff(new Date(Date.now() - 3 * 60 * 60 * 1000), 'PAST');
// { value: 3, unit: 'HOUR' }
```

### Restricted Units

```ts
import { timeDiff } from '@vielzeug/toolkit';

// Show difference only in hours, even if it's days away
timeDiff(futureDate, 'FUTURE', ['HOUR']);
```

## Implementation Notes

- Performance-optimized for real-time updates.
- Uses `Math.floor` for all calculated values.
- Throws nothing; handles invalid dates gracefully.

## See Also

- [expires](./expires.md): Categorize a date's expiration status.
- [interval](./interval.md): Generate a sequence of dates.
