# list

Creates a paginated, filterable, and sortable list from an initial array of data.

## API

```ts
list<T>(initialData: T[], config?: {
  filterFn?: (item: T) => boolean;
  limit?: number;
  sortFn?: (a: T, b: T) => number;
}): {
  current: T[];
  data: T[];
  offset: number;
  pages: T[][];
  next(): T[];
  prev(): T[];
  setQuery(query: string): T[];
  setFilter(fn: (item: T) => boolean): T[];
  setLimit(limit: number): T[];
  setSort(fn: (a: T, b: T) => number): T[];
}
```

- `initialData`: The initial array of data.
- `config`: Optional configuration object:
  - `filterFn`: Function to filter items.
  - `limit`: Number of items per page.
  - `sortFn`: Function to sort items.

### Returns

- An object with pagination, filtering, and sorting methods and properties.

## Example

```ts
import { list } from '@vielzeug/toolkit';

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const l = list(arr, { limit: 3 });
l.current; // [1, 2, 3]
l.next(); // [4, 5, 6]
l.setFilter(x => x % 2 === 0); // [2, 4, 6, 8, 10]
```

## Notes

- Supports pagination, filtering, sorting, and searching.
- Useful for building tables, lists, or search UIs.

## See also

- [range](../../math/range.md)
