# every

Checks if all elements in an array pass a predicate function.

## API

```ts
every<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): boolean
```

- `array`: The array to check.
- `predicate`: The function to test each element.

### Returns

- `true` if all elements pass the predicate test, otherwise `false`.

## Example

```ts
import { every } from '@vielzeug/toolkit';

const arr = [2, 4, 6];
every(arr, (x) => x % 2 === 0); // true

every([1, 2, 3, 4, 5], (num) => num > 0); // true
every([1, 2, 3, 4, 5], (num) => num % 2 === 0); // false
```

## Notes

- Throws `TypeError` if the first argument is not an array.
- Useful for validation, filtering, or conditional logic.

## See also

- [some](./some.md)
