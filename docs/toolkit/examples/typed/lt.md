# lt

Checks if the first value is less than the second value.

## API

```ts
lt<T>(a: T, b: T): boolean
```

- `a`: First value.
- `b`: Second value.
- Returns: `true` if `a < b`, else `false`.

## Example

```ts
import { lt } from '@vielzeug/toolkit';

lt(2, 3); // true
lt(3, 3); // false
lt(4, 3); // false
```

## Notes

- Works with numbers, strings, and other comparable types.

## Related

- [le](./le.md)
- [gt](./gt.md)
