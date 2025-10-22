# isEqual

Checks if two values are deeply equal.

## API

```ts
isEqual(a: unknown, b: unknown): boolean
```

- `a`: First value.
- `b`: Second value.
- Returns: `true` if values are deeply equal, else `false`.

## Example

```ts
import { isEqual } from '@vielzeug/toolkit';

isEqual({ a: 1 }, { a: 1 }); // true
isEqual([1, 2], [1, 2]); // true
isEqual({ a: 1 }, { a: 2 }); // false
```

## Notes

- Performs deep comparison for objects and arrays.
- Useful for testing and change detection.

## Related

- [is](./is.md)
- [isMatch](./isMatch.md)
