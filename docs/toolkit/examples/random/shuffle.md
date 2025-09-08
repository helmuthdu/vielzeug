# shuffle

Randomly shuffles the elements of an array in place.

## API

```ts
shuffle<T>(array: T[]): T[]
```

- `array`: Array to shuffle.
- Returns: The shuffled array (same reference as input).

## Example

```ts
import { shuffle } from '@vielzeug/toolkit';

shuffle([1, 2, 3, 4]); // e.g. [3, 1, 4, 2]
```

## Notes

- Uses Fisher-Yates algorithm for unbiased shuffling.
- Modifies the original array.

## Related

- [draw](./draw.md)
- [random](./random.md)
