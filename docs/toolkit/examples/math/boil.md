# boil

Reduces an array of values to a single value using a reducer function, similar to Array.prototype.reduce but with a simpler signature.

## API

```ts
boil<T, R>(array: T[], reducer: (acc: R, value: T, index: number, array: T[]) => R, initial: R): R
```

- `array`: Array to reduce.
- `reducer`: Function to apply to each element.
- `initial`: Initial accumulator value.
- Returns: The reduced value.

## Example

```ts
import { boil } from '@vielzeug/toolkit';

boil([1, 2, 3], (acc, n) => acc + n, 0); // 6
boil(['a', 'b', 'c'], (acc, s) => acc + s, ''); // 'abc'
```

## Notes

- Similar to `Array.prototype.reduce` but with a more explicit signature.
- Useful for custom aggregations.

## Related

- [sum](./sum.md)
- [average](./average.md)
