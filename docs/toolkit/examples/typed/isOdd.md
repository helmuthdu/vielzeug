# isOdd

Checks if a number is odd.

## API

```ts
isOdd(value: number): boolean
```

- `value`: Number to check.
- Returns: `true` if value is odd, else `false`.

## Example

```ts
import { isOdd } from '@vielzeug/toolkit';

isOdd(3); // true
isOdd(2); // false
```

## Notes

- Only works with numbers.

## Related

- [isEven](./isEven.md)
- [isNumber](./isNumber.md)
