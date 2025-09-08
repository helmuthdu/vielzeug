# isNegative

Checks if a number is negative.

## API

```ts
isNegative(value: number): boolean
```

- `value`: Number to check.
- Returns: `true` if value is negative, else `false`.

## Example

```ts
import { isNegative } from '@vielzeug/toolkit';

isNegative(-5); // true
isNegative(0); // false
```

## Notes

- Only works with numbers.

## Related

- [isPositive](./isPositive.md)
- [isNumber](./isNumber.md)
