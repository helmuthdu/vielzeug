# draw

Selects a random element from an array.

## API

```ts
draw<T>(array: T[]): T | undefined
```

- `array`: Array to select from.
- Returns: A random element, or `undefined` if the array is empty.

## Example

```ts
import { draw } from '@vielzeug/toolkit';

draw([1, 2, 3, 4]); // e.g. 2
```

## Notes

- Returns `undefined` for an empty array.
- Useful for random sampling.

## Related

- [random](./random.md)
- [shuffle](./shuffle.md)
