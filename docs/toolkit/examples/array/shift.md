# shift

Shifts the elements of an array to the left by a specified number of positions. Optionally rotates shifted elements to the end.

## API

```ts
shift<T>(array: T[], positions: number, rotate?: boolean): T[]
```

- `array`: The array to shift.
- `positions`: Number of positions to shift (can be negative).
- `rotate`: If true, shifted elements are added to the end (default: false).

### Returns

- A new array with the elements shifted.

## Example

```ts
import { shift } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4, 5];
shift(arr, 2); // [3, 4, 5]
shift(arr, 2, true); // [3, 4, 5, 1, 2]
```

## Notes

- Throws `TypeError` if the input is not an array or positions is not a number.
- Useful for pagination, rotation, or cyclic data.

## See also

- [pop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop)
