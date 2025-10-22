# isPrimitive

Checks if a value is a JavaScript primitive (string, number, boolean, symbol, null, or undefined).

## API

```ts
isPrimitive(value: unknown): boolean
```

- `value`: Value to check.
- Returns: `true` if value is a primitive, else `false`.

## Example

```ts
import { isPrimitive } from '@vielzeug/toolkit';

isPrimitive(42); // true
isPrimitive('foo'); // true
isPrimitive({}); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isObject](./isObject.md)
- [isArray](./isArray.md)
