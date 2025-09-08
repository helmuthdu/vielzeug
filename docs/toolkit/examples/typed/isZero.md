# isZero

Checks if a value is exactly zero.

## API

```ts
isZero(value: number): boolean
```

- `value`: Number to check.
- Returns: `true` if value is 0, else `false`.

## Example

```ts
import { isZero } from '@vielzeug/toolkit';

isZero(0); // true
isZero(1); // false
```

## Notes

- Only works with numbers.

## Related

- [isNumber](./isNumber.md)
- [isPositive](./isPositive.md)
- [isNegative](./isNegative.md)
