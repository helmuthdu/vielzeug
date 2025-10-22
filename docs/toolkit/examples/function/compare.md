# compare

Compares two values and returns -1, 0, or 1 based on their order. Useful for sorting and ordering operations.

## API

```ts
compare<T>(a: T, b: T): -1 | 0 | 1
```

- `a`: First value to compare.
- `b`: Second value to compare.
- Returns: -1 if a < b, 1 if a > b, 0 if equal.

## Example

```ts
import { compare } from '@vielzeug/toolkit';

compare(1, 2); // -1
compare(2, 1); // 1
compare(2, 2); // 0
```

## Notes

- Used as a comparator in array sorting and ordering functions.
- Handles numbers, strings, and other comparable types.

## Related

- [compareBy](./compareBy.md)
- [sort](../array/sort.md)
