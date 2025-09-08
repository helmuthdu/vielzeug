# rate

Calculates the rate of change between two values.

## API

```ts
rate(current: number, previous: number): number
```

- `current`: The current value.
- `previous`: The previous value.
- Returns: The rate of change (as a decimal, not percent).

## Example

```ts
import { rate } from '@vielzeug/toolkit';

rate(120, 100); // 0.2 (20% increase)
rate(80, 100); // -0.2 (20% decrease)
```

## Notes

- Returns `Infinity` or `-Infinity` if `previous` is 0.
- Useful for calculating growth or decline.

## Related

- [average](./average.md)
- [sum](./sum.md)
