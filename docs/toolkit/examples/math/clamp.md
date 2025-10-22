# clamp

Restricts a number to be within a specified range.

## API

```ts
clamp(value: number, min: number, max: number): number
```

- `value`: The number to clamp.
- `min`: Minimum allowed value.
- `max`: Maximum allowed value.
- Returns: The clamped value.

## Example

```ts
import { clamp } from '@vielzeug/toolkit';

clamp(5, 1, 10); // 5
clamp(-2, 0, 8); // 0
clamp(15, 0, 8); // 8
```

## Notes

- If `min` > `max`, the function swaps them internally.
- Useful for bounding values in UI, games, etc.

## Related

- [min](./min.md)
- [max](./max.md)
