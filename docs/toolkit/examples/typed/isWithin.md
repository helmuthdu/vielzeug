# isWithin

Checks if a value is within a specified range (inclusive).

## API

```ts
isWithin(value: number, min: number, max: number): boolean
```

- `value`: Number to check.
- `min`: Minimum value (inclusive).
- `max`: Maximum value (inclusive).
- Returns: `true` if value is within the range, else `false`.

## Example

```ts
import { isWithin } from '@vielzeug/toolkit';

isWithin(5, 1, 10); // true
isWithin(0, 1, 10); // false
```

## Notes

- Useful for validation and bounds checking.

## Related

- [clamp](../math/clamp.md)
- [isNumber](./isNumber.md)
