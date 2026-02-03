<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2864_B-success" alt="Size">
</div>

# list

The `list` utility creates a stateful, paginated, and filterable data structure from an initial array. It provides a convenient API for managing UI components like tables or searchable lists, handling sorting, filtering, and page navigation automatically.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/list.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Stateful Management**: Easily track the current page, total pages, and filtered results.
- **Integrated Pagination**: Built-in `next()` and `prev()` methods for easy navigation.
- **Reactive Updates**: Sorting, filtering, and limit changes automatically recalculate the current view.

## API

```ts
interface ListConfig<T> {
  filterFn?: (item: T) => boolean;
  limit?: number;
  sortFn?: (a: T, b: T) => number;
}

interface ListResult<T> {
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

interface ListFunction {
  <T>(initialData: T[], config?: ListConfig<T>): ListResult<T>;
}
```

### Parameters

- `initialData`: The source array of data.
- `config`: Optional configuration object:
  - `filterFn`: Initial function to filter items.
  - `limit`: Number of items per page (defaults to the full array length).
  - `sortFn`: Initial function to sort items.

### Returns

- An object containing the current state and methods to manipulate the list.

## Examples

### Basic Pagination

```ts
import { list } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const myList = list(numbers, { limit: 3 });

console.log(myList.current); // [1, 2, 3]

myList.next();
console.log(myList.current); // [4, 5, 6]

myList.prev();
console.log(myList.current); // [1, 2, 3]
```

### Dynamic Filtering & Sorting

```ts
import { list } from '@vielzeug/toolkit';

const users = [
  { name: 'Charlie', age: 35 },
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
];

const userList = list(users, { limit: 10 });

// Sort by name
userList.setSort((a, b) => a.name.localeCompare(b.name));
console.log(userList.current[0].name); // 'Alice'

// Filter by age
userList.setFilter((u) => u.age > 30);
console.log(userList.current.length); // 1 (Charlie)
```

## Implementation Notes

- Returns a new object with bound methods; the original `initialData` array is not mutated.
- The `setQuery` method performs a fuzzy search across string properties of the objects (similar to the [`search`](./search.md) utility).
- All `set*` methods return the updated `current` page for immediate use.

## See Also

- [search](./search.md): Fuzzy search functionality used internally.
- [sort](./sort.md): Functional sorting utility.
- [chunk](./chunk.md): Basic array splitting without state management.
