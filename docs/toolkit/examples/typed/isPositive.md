# isPositive

Checks if a number is positive.

## API

```ts
isPositive(value: number): boolean
```

- `value`: Number to check.
- Returns: `true` if value is positive, else `false`.

## Example

```ts
import { isPositive } from '@vielzeug/toolkit';

isPositive(5); // true
isPositive(0); // false
```

## Notes

- Only works with numbers.

## Related

- [isNegative](./isNegative.md)
- [isNumber](./isNumber.md)
