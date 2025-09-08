# isArray

Checks if a value is an array.

## API

```ts
isArray(value: unknown): value is unknown[]
```

- `value`: Value to check.
- Returns: `true` if value is an array, else `false`.

## Example

```ts
import { isArray } from '@vielzeug/toolkit';

isArray([1, 2, 3]); // true
isArray('foo'); // false
```

## Notes

- Uses `Array.isArray` internally.

## Related

- [isObject](./isObject.md)
- [isFunction](./isFunction.md)
