# isString

Checks if a value is a string.

## API

```ts
isString(value: unknown): value is string
```

- `value`: Value to check.
- Returns: `true` if value is a string, else `false`.

## Example

```ts
import { isString } from '@vielzeug/toolkit';

isString('foo'); // true
isString(42); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isNumber](./isNumber.md)
- [isBoolean](./isBoolean.md)
