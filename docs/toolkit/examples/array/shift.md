# shift

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1297_B-success" alt="Size">
</div>

The `shift` utility rearranges elements in an array by moving them to the left by a specified number of positions. It also supports rotation, where elements shifted off the front are moved to the end of the array.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Rotation Support**: Cycle through array elements easily.
- **Flexible Positioning**: Supports both positive (left shift) and negative (right shift) offsets.
- **Immutable**: Returns a new array, leaving the original array unchanged.

## API

```ts
interface ShiftFunction {
  <T>(array: T[], positions: number, rotate?: boolean): T[]
}
```

### Parameters

- `array`: The array to shift.
- `positions`: The number of positions to shift the elements. Use negative numbers to shift to the right.
- `rotate`: Optional. If `true`, elements that are shifted off one end of the array are reapplied to the other end (circular shift). Defaults to `false`.

### Returns

- A new array with elements shifted.

## Examples

### Basic Shifting (Removal)

```ts
import { shift } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5];

// Shift 2 positions to the left (removes first two)
shift(numbers, 2); // [3, 4, 5]
```

### Rotating Elements

```ts
import { shift } from '@vielzeug/toolkit';

const letters = ['A', 'B', 'C', 'D'];

// Rotate 1 position to the left
shift(letters, 1, true); // ['B', 'C', 'D', 'A']

// Rotate 1 position to the right (negative shift)
shift(letters, -1, true); // ['D', 'A', 'B', 'C']
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- If `rotate` is `false`, shifting more positions than the array length returns an empty array.
- If `rotate` is `true`, shifting more positions than the array length is handled using modulo, ensuring continuous rotation.

## See Also

- [substitute](./substitute.md): Replace elements in an array.
- [chunk](./chunk.md): Split an array into smaller segments.
- [list](./list.md): Create arrays from ranges or values.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
