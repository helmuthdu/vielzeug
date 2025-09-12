# round

Rounds a number to a specified number of decimal places.

## API

```ts
round(value: number, decimals?: number): number
```

- `value`: Number to round.
- `decimals`: Number of decimal places (default: 0).
- Returns: Rounded number.

## Example

```ts
import { round } from '@vielzeug/toolkit';

round(3.14159); // 3
round(3.14159, 2); // 3.14
round(3.14159, 4); // 3.1416
```

## Notes

- Handles negative and large numbers.
- Defaults to rounding to the nearest integer.

## Related

- [clamp](./clamp.md)
- [sum](./sum.md)
