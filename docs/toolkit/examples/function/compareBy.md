# compareBy

Creates a comparator function based on a selector, for use in sorting and ordering operations.

## API

```ts
compareBy<T>(selector: (item: T) => unknown): (a: T, b: T) => -1 | 0 | 1
```

- `selector`: Function to extract the value to compare from each item.
- Returns: Comparator function for use in sorting.

## Example

```ts
import { compareBy } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
];

users.sort(compareBy(user => user.age));
// [ { name: 'Bob', age: 25 }, { name: 'Alice', age: 30 } ]
```

## Notes

- Useful for sorting arrays of objects by a specific property.
- Works with any selector function.

## Related

- [compare](./compare.md)
- [sortBy](../array/sortBy.md)
