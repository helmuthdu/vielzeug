<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# rotate

The `rotate` utility shifts the elements of an array by a given number of positions. By default the rotated-out prefix is discarded; pass `{ wrap: true }` to append it to the end instead.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/rotate.ts
:::

## Features

- **Immutable**: Returns a new array.
- **Wrap mode**: Optionally cycles the removed prefix back to the end.
- **Negative-safe normalization**: Handles positions larger than the array length.

## API

```ts
function rotate<T>(array: T[], positions: number, options?: { wrap?: boolean }): T[];
```

### Parameters

- `array`: The array to rotate.
- `positions`: Number of positions to rotate left (shift from the front).
- `options.wrap`: If `true`, the removed prefix is appended to the end (default: `false`).

### Returns

- A new rotated array.

### Throws

- `TypeError`: If `array` is not an array or `positions` is not a number.

## Examples

### Rotate Without Wrap (Truncate)

```ts
import { rotate } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4, 5];

rotate(arr, 2);              // [3, 4, 5]
rotate(arr, 3);              // [4, 5]
```

### Rotate With Wrap (Cycle)

```ts
import { rotate } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4, 5];

rotate(arr, 2, { wrap: true }); // [3, 4, 5, 1, 2]
rotate(arr, 1, { wrap: true }); // [2, 3, 4, 5, 1]
```

### Carousel / Round-Robin

```ts
import { rotate } from '@vielzeug/toolkit';

const slides = ['A', 'B', 'C', 'D'];
let current = 0;

function next() {
  current = (current + 1) % slides.length;
  return rotate(slides, current, { wrap: true });
}

next(); // ['B', 'C', 'D', 'A']
next(); // ['C', 'D', 'A', 'B']
```

## See Also

- [chunk](./chunk.md): Split an array into equal-sized pieces.
- [toggle](./toggle.md): Add or remove an item from an array.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>
