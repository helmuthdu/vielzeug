# le

Checks if the first value is less than or equal to the second value.

## API

```ts
le<T>(a: T, b: T): boolean
```

- `a`: First value.
- `b`: Second value.
- Returns: `true` if `a <= b`, else `false`.

## Example

```ts
import { le } from '@vielzeug/toolkit';

le(2, 3); // true
le(3, 3); // true
le(4, 3); // false
```

## Notes

- Works with numbers, strings, and other comparable types.

## Related

- [lt](./lt.md)
- [ge](./ge.md)
