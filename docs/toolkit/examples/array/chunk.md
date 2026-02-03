<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1533_B-success" alt="Size">
</div>

# chunk

The `chunk` utility splits an array or string into smaller pieces (chunks) of a specified size.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/chunk.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Versatile**: Supports both arrays and strings.
- **Overlapping**: Optional support for overlapping chunks in strings.
- **Padding**: Optional padding for string chunks that don't meet the chunk size.

## API

```ts
interface ChunkOptions {
  overlap?: boolean;
  pad?: string;
}

interface ChunkFunction {
  <T>(array: T[], size?: number): T[][];
  (str: string, size?: number, options?: ChunkOptions): string[];
}
```

### Parameters

- `input`: The array or string to be chunked.
- `size`: The size of each chunk (default: 2).
- `options`: Optional configuration (for strings):
  - `overlap`: If `true`, chunks will overlap by one character.
  - `pad`: Character used to pad the last chunk if it's shorter than `size`.

### Returns

- An array containing the chunks.

## Examples

### Array Chunking

```ts
import { chunk } from '@vielzeug/toolkit';

const data = [1, 2, 3, 4, 5, 6, 7];

chunk(data, 2); // [[1, 2], [3, 4], [5, 6], [7]]
chunk(data, 3); // [[1, 2, 3], [4, 5, 6], [7]]
```

### String Chunking

```ts
import { chunk } from '@vielzeug/toolkit';

chunk('vielzeug', 3); // ['vie', 'lze', 'ug '] (padded with space by default)

// Custom padding
chunk('hello', 2, { pad: '_' }); // ['he', 'll', 'o_']

// Overlapping chunks
chunk('abc', 2, { overlap: true }); // [' a', 'ab', 'bc', 'c ']
```

## Implementation Notes

- Throws `TypeError` if input is neither an array nor a string.
- Throws `RangeError` if `size` is less than 1.
- For arrays, the last chunk may be smaller than `size` if the total length is not perfectly divisible.

## See Also

- [flatten](./flatten.md): The inverse operation for arrays.
- [group](./group.md): Group array elements by a criterion.
