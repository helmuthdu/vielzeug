# isDate

Checks if a value is a Date object.

## API

```ts
isDate(value: unknown): value is Date
```

- `value`: Value to check.
- Returns: `true` if value is a Date, else `false`.

## Example

```ts
import { isDate } from '@vielzeug/toolkit';

isDate(new Date()); // true
isDate('2020-01-01'); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isNumber](./isNumber.md)
- [isString](./isString.md)
