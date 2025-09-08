# some

Checks if at least one element in an array satisfies the provided predicate function.

## API

```ts
some<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): boolean
```

- `array`: The array to check.
- `predicate`: The function to test each element.

### Returns

- `true` if at least one element satisfies the predicate, otherwise `false`.

## Example

```ts
import { some } from '@vielzeug/toolkit';

const arr = [1, 3, 5, 6];
some(arr, (x) => x % 2 === 0); // true
some(arr, (x) => x > 10); // false
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for validation, filtering, or conditional logic.

## See also

- [every](./every.md)
