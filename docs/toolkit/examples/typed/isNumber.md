# isNumber

Checks if a value is a number (not NaN).

## API

```ts
isNumber(value: unknown): value is number
```

- `value`: Value to check.
- Returns: `true` if value is a number and not NaN, else `false`.

## Example

```ts
import { isNumber } from '@vielzeug/toolkit';

isNumber(42); // true
isNumber(NaN); // false
isNumber('42'); // false
```

## Notes

- Excludes NaN.
- Useful for type guards and validation.

## Related

- [isString](./isString.md)
- [isBoolean](./isBoolean.md)
