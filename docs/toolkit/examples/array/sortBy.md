# sortBy

Sorts an array of objects based on multiple properties and directions.

## API

```ts
sortBy<T>(array: T[], selectors: Partial<Record<keyof T, 'asc' | 'desc'>>): T[]
```

- `array`: The array to sort.
- `selectors`: Object where keys are properties and values are 'asc' or 'desc'.

### Returns

- A new array sorted by the specified properties and directions.

## Example

```ts
import { sortBy } from '@vielzeug/toolkit';

const data = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Charlie', age: 35 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 30 }
];
sortBy(data, { name: 'asc', age: 'desc' });
// [ { name: 'Alice', age: 30 }, { name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }, { name: 'Bob', age: 25 }, { name: 'Charlie', age: 35 }, { name: 'Charlie', age: 30 } ]
```

## Notes

- Useful for sorting by multiple fields (e.g., name then age).

## See also

- [sort](./sort.md)
