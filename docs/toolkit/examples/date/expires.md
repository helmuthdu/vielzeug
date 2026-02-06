<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

# expires

The `expires` utility determines the expiration status of a given date relative to the current time. It categorizes the date into states like `EXPIRED`, `SOON`, or `LATER`, making it ideal for subscription management, token validation, or deadline tracking.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/date/expires.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Human-Friendly States**: Returns descriptive status strings instead of raw boolean flags.
- **Configurable "Soon" Window**: Define exactly how many days count as "soon" for your application.
- **Robust Parsing**: Accepts `Date` objects, ISO strings, or timestamps.

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/date/expires.ts#Expires
:::

```ts
function expires(date: string | Date, days?: number): Expires
```

### Parameters

- `date`: The expiration date to check.
- `days`: Optional. The number of days in the future to consider as "SOON" (defaults to `7`).

### Returns

- `'EXPIRED'`: The date is in the past.
- `'SOON'`: The date is within the specified `days` window.
- `'LATER'`: The date is in the future, beyond the "soon" window.
- `'NEVER'`: The year is 9999 or later (perpetual).
- `'UNKNOWN'`: The provided date is invalid.

## Examples

### Basic Expiration Check

```ts
import { expires } from '@vielzeug/toolkit';

// If today is 2024-01-01
expires('2023-12-31'); // 'EXPIRED'
expires('2024-01-05'); // 'SOON'
expires('2024-02-01'); // 'LATER'
```

### Custom Threshold

```ts
import { expires } from '@vielzeug/toolkit';

// Consider only the next 48 hours as "SOON"
expires(someDate, 2);
```

## Implementation Notes

- Uses `Date.now()` as the reference point for comparison.
- Properly handles timezone differences by relying on the environment's `Date` implementation.
- Throws nothing; returns `'UNKNOWN'` for malformed date inputs.

## See Also

- [timeDiff](./timeDiff.md): Calculate the precise difference between two dates.
- [interval](./interval.md): Get a breakdown of days, hours, and minutes.
