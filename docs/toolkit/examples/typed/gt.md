# gt

Checks if the first value is greater than the second value.

## API

```ts
gt<T>(a: T, b: T): boolean
```

- `a`: First value.
- `b`: Second value.
- Returns: `true` if `a > b`, else `false`.

## Example

```ts
import { gt } from '@vielzeug/toolkit';

gt(5, 3); // true
gt(2, 2); // false
gt(1, 4); // false
```

## Notes

- Works with numbers, strings, and other comparable types.

## Related

- [ge](./ge.md)
- [lt](./lt.md)
