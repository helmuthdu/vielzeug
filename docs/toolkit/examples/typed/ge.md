# ge

Checks if the first value is greater than or equal to the second value.

## API

```ts
ge<T>(a: T, b: T): boolean
```

- `a`: First value.
- `b`: Second value.
- Returns: `true` if `a >= b`, else `false`.

## Example

```ts
import { ge } from '@vielzeug/toolkit';

ge(5, 3); // true
ge(2, 2); // true
ge(1, 4); // false
```

## Notes

- Works with numbers, strings, and other comparable types.

## Related

- [gt](./gt.md)
- [le](./le.md)
