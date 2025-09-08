# isObject

Checks if a value is a plain object (not null, array, or function).

## API

```ts
isObject(value: unknown): value is object
```

- `value`: Value to check.
- Returns: `true` if value is a plain object, else `false`.

## Example

```ts
import { isObject } from '@vielzeug/toolkit';

isObject({}); // true
isObject([]); // false
isObject(null); // false
```

## Notes

- Excludes arrays, functions, and null.
- Useful for type guards and validation.

## Related

- [isArray](./isArray.md)
- [isFunction](./isFunction.md)
