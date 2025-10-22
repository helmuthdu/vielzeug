# sort

Sorts an array of objects by a specific key in ascending or descending order.

## API

```ts
sort<T>(array: T[], selector: (item: T) => any, desc?: boolean): T[]
```

- `array`: The array to sort.
- `selector`: Function to extract the key to sort by.
- `desc`: If true, sorts in descending order (default: false).

### Returns

- A new array sorted by the specified key.

## Example

```ts
import { sort } from '@vielzeug/toolkit';

const arr = [{ n: 3 }, { n: 1 }, { n: 2 }];
sort(arr, (x) => x.n); // [{ n: 1 }, { n: 2 }, { n: 3 }]
sort(arr, (x) => x.n, true); // [{ n: 3 }, { n: 2 }, { n: 1 }]
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for sorting by any property or computed value.

## See also

- [sortBy](./sortBy.md)
