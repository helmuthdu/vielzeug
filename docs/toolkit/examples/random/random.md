# random

Generates a random number within a specified range.

## API

```ts
random(min?: number, max?: number): number
```

- `min`: Minimum value (inclusive, default: 0).
- `max`: Maximum value (exclusive, default: 1).
- Returns: A random number in the range [min, max).

## Example

```ts
import { random } from '@vielzeug/toolkit';

random(); // e.g. 0.534
random(1, 10); // e.g. 7.23
```

## Notes

- If only `max` is provided, `min` defaults to 0.
- Useful for games, simulations, and sampling.

## Related

- [draw](./draw.md)
- [shuffle](./shuffle.md)
