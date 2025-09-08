# expires

Determines the expiry status of a given date compared to the current time.

## API

```ts
expires(date: string | Date, days?: number): 'EXPIRED' | 'SOON' | 'LATER' | 'NEVER' | 'UNKNOWN'
```

- `date`: The date to check, as a string or Date object.
- `days`: Number of days before expiry to be considered "SOON" (default: 7).

### Returns

- `'EXPIRED'`: The date is in the past.
- `'SOON'`: The date is within the next `days`.
- `'LATER'`: The date is further in the future.
- `'NEVER'`: The year is >= 9999.
- `'UNKNOWN'`: The date is invalid.

## Example

```ts
import { expires } from '@vielzeug/toolkit';

expires('2024-06-01'); // 'EXPIRED', if today is after June 1, 2024
expires(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)); // 'SOON', if within 7 days
expires(new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)); // 'LATER'
expires(new Date('9999-01-01')); // 'NEVER'
expires('invalid-date'); // 'UNKNOWN'
```

## Notes

- Returns a status string for expiry, not a boolean.
- Useful for reminders, deadlines, or TTL logic.
