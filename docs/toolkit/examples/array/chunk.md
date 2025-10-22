# chunk

Splits an array or string into chunks of a specified size. Supports overlap and padding for strings.

## API

```ts
chunk<T>(input: T[] | string, size?: number, options?: { overlap?: boolean; pad?: string }): (T[] | string)[]
```

- `input`: The array or string to be chunked.
- `size`: The size of each chunk (default: 2).
- `options`: Optional object:
  - `overlap`: If true (for strings), chunks overlap by one character.
  - `pad`: Padding character for string chunks (default: ' ').

### Returns

- An array of chunks (arrays for array input, strings for string input).

## Example

```ts
import { chunk } from '@vielzeug/toolkit';

chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
chunk('hello', 2); // ['he', 'll', 'o']
chunk('hello', 2, { overlap: true }); // [' h', 'he', 'el', 'll', 'lo', 'o ']
```

## Notes

- Throws `RangeError` if chunk size is invalid.
- Throws `TypeError` if input is not array or string.
- Useful for pagination, batching, or string manipulation.

## See also

- [flatten](./flatten.md)
