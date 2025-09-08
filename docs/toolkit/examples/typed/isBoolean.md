# isBoolean

Checks if a value is a boolean.

## API

```ts
isBoolean(value: unknown): value is boolean
```

- `value`: Value to check.
- Returns: `true` if value is a boolean, else `false`.

## Example

```ts
import { isBoolean } from '@vielzeug/toolkit';

isBoolean(true); // true
isBoolean(false); // true
isBoolean(0); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isNumber](./isNumber.md)
- [isString](./isString.md)
