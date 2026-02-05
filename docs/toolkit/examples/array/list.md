<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2864_B-success" alt="Size">
</div>

# list

Creates a paginated list with filtering, sorting, and searching capabilities.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/list.ts
:::

## Features

- **Pagination**: Automatic chunking with configurable page size
- **Filtering**: Apply custom filter predicates
- **Searching**: Debounced fuzzy search (300ms delay)
- **Sorting**: Custom sort functions with dynamic updates
- **Iterable**: Supports `for...of` loops to iterate through all pages
- **Metadata**: Rich pagination metadata (current page, total pages, isEmpty, etc.)
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function list<T>(initialData: readonly T[], config?: Config<T>): PaginatedList<T>;

interface Config<T> {
  filterFn?: (value: T, index: number, array: readonly T[]) => boolean;
  limit?: number;
  sortFn?: (a: T, b: T) => number;
  searchFn?: (items: readonly T[], query: string, tone: number) => readonly T[];
  searchTone?: number;
  debounceMs?: number;
}

interface PaginatedList<T> {
  // Properties (getters/setters)
  current: readonly T[]; // Current page data (getter)
  data: readonly T[]; // Get/set entire dataset (setter resets to page 1)
  limit: number; // Page size (setter, min: 1)
  meta: {
    // Pagination metadata (getter)
    page: number; // Current page (1-indexed)
    pages: number; // Total pages
    total: number; // Total items (after filtering)
    start: number; // First item index (1-indexed)
    end: number; // Last item index (1-indexed)
    limit: number; // Page size
    isEmpty: boolean; // Whether list is empty
    isFirst: boolean; // Whether on first page
    isLast: boolean; // Whether on last page
  };

  // Methods
  batch(mutator: (ctx: BatchContext<T>) => void): readonly T[]; // Batch multiple updates
  filter(predicate: Predicate<T>): readonly T[]; // Filter and reset to page 1
  goTo(page: number): readonly T[]; // Navigate to specific page (1-indexed)
  next(): readonly T[]; // Navigate to next page
  pages(): IterableIterator<readonly T[]>; // Generator for all pages
  prev(): readonly T[]; // Navigate to previous page
  reset(): readonly T[]; // Reset to initial state
  search(query: string): void; // Search (debounced)
  searchNow(query: string): readonly T[]; // Search immediately (no debounce)
  sort(fn?: (a: T, b: T) => number): readonly T[]; // Apply or remove sort
  [Symbol.iterator](): Iterator<readonly T[]>; // Iterate all pages
}

interface BatchContext<T> {
  setLimit(n: number): void;
  setFilter(predicate: Predicate<T>): void;
  setSort(fn?: Sorter<T>): void;
  setQuery(q: string): void;
  setData(d: readonly T[]): void;
  goTo(page: number): void;
}
```

### Parameters

- `initialData: readonly T[]` - The initial array of data to paginate
- `config?: Config<T>` - Optional configuration object
  - `limit?: number` - Number of items per page (default: 10, minimum: 1)
  - `filterFn?: Predicate<T>` - Initial filter predicate (default: returns true for all items)
  - `sortFn?: (a: T, b: T) => number` - Sort comparison function
  - `searchFn?: (items, query, tone) => items` - Custom search implementation
  - `searchTone?: number` - Search intensity/threshold (default: 0.5)
  - `debounceMs?: number` - Debounce delay for search in milliseconds (default: 300)

### Returns

A paginated list instance with properties and methods for managing pagination, filtering, and sorting

## Examples

### Basic Pagination

```ts
import { list } from '@vielzeug/toolkit';

const data = [1, 2, 3, 4, 5, 6];
const instance = list(data, { limit: 3 });

console.log(instance.current); // [1, 2, 3]
console.log(instance.meta.pages); // 2

instance.next();
console.log(instance.current); // [4, 5, 6]

instance.prev();
console.log(instance.current); // [1, 2, 3]
```

### Pagination Metadata

```ts
import { list } from '@vielzeug/toolkit';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const instance = list(data, { limit: 3 });

console.log(instance.meta);
// {
//   page: 1,
//   pages: 4,
//   total: 10,
//   start: 1,
//   end: 3,
//   limit: 3,
//   isEmpty: false,
//   isFirst: true,
//   isLast: false
// }
```

### Filtering and Searching

```ts
import { list } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 },
];

const instance = list(users, { limit: 10 });

// Filter by age
instance.filter((user) => user.age > 25);
console.log(instance.current);
// [{ name: 'Bob', age: 30 }, { name: 'Charlie', age: 35 }]

// Debounced search (300ms delay)
instance.search('Bob');
// After 300ms delay:
// instance.current will be [{ name: 'Bob', age: 30 }]

// Immediate search (no debounce)
instance.searchNow('Charlie');
console.log(instance.current);
// [{ name: 'Charlie', age: 35 }]
```

### Sorting

```ts
import { list } from '@vielzeug/toolkit';

const users = [
  { name: 'Charlie', age: 35 },
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
];

const instance = list(users);

// Sort by name
instance.sort((a, b) => a.name.localeCompare(b.name));
console.log(instance.current[0].name); // 'Alice'

// Sort by age descending
instance.sort((a, b) => b.age - a.age);
console.log(instance.current[0].name); // 'Charlie'

// Remove sorting
instance.sort();
console.log(instance.current[0].name); // 'Charlie' (original order)
```

### Iterating Pages

```ts
import { list } from '@vielzeug/toolkit';

const data = [1, 2, 3, 4, 5, 6];
const instance = list(data, { limit: 2 });

// Using for...of (Symbol.iterator)
for (const page of instance) {
  console.log(page);
}
// Output:
// [1, 2]
// [3, 4]
// [5, 6]

// Using pages() generator explicitly
const allPages = [...instance.pages()];
console.log(allPages); // [[1, 2], [3, 4], [5, 6]]
```

### Navigate to Specific Page

```ts
import { list } from '@vielzeug/toolkit';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const instance = list(data, { limit: 3 });

// Navigate to page 2
instance.goTo(2);
console.log(instance.current); // [4, 5, 6]
console.log(instance.meta.page); // 2

// Navigate to page 3
instance.goTo(3);
console.log(instance.current); // [7, 8, 9]

// Out of bounds - clamped to valid range
instance.goTo(10);
console.log(instance.current); // [7, 8, 9] (last page)
```

### Dynamic Updates

```ts
import { list } from '@vielzeug/toolkit';

const instance = list([1, 2, 3]);

// Update dataset (resets to page 1)
instance.data = [4, 5, 6, 7, 8];
console.log(instance.current); // [4, 5, 6, 7, 8]

// Get raw data
console.log(instance.data); // [4, 5, 6, 7, 8]

// Change page size
instance.limit = 2;
console.log([...instance.pages()]); // [[4, 5], [6, 7], [8]]

// Navigate to specific page
instance.goTo(2);
console.log(instance.current); // [6, 7]
```

### Reset to Initial State

```ts
import { list } from '@vielzeug/toolkit';

const instance = list([1, 2, 3, 4, 5], {
  limit: 2,
  filterFn: (x) => x > 2,
});

instance.next();
instance.searchNow('query');

console.log(instance.meta.page); // 2

// Reset to initial state
instance.reset();
console.log(instance.meta.page); // 1
console.log(instance.current); // [3, 4] (initial filter applied)
```

### Batch Updates

```ts
import { list } from '@vielzeug/toolkit';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const instance = list(data, { limit: 3 });

// Apply multiple updates in one go (more efficient)
const result = instance.batch((ctx) => {
  ctx.setLimit(2);
  ctx.setFilter((x) => x % 2 === 0);
  ctx.setSort((a, b) => b - a);
  ctx.goTo(2);
});

console.log(result); // [6, 4]
console.log(instance.current); // [6, 4]
console.log(instance.meta.page); // 2
```

### Custom Search Function

```ts
import { list } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' },
];

// Custom search that searches across multiple fields
const customSearch = (items: readonly (typeof users)[number][], query: string) => {
  const q = query.toLowerCase();
  return items.filter((user) => user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q));
};

const instance = list(users, { searchFn: customSearch });

instance.searchNow('bob');
console.log(instance.current);
// [{ name: 'Bob', email: 'bob@example.com' }]

instance.searchNow('example.com');
console.log(instance.current);
// All users (all emails contain 'example.com')
```

### Custom Debounce Time

```ts
import { list } from '@vielzeug/toolkit';

const data = ['apple', 'banana', 'cherry', 'date'];

// Use longer debounce delay (500ms)
const instance = list(data, { debounceMs: 500 });

instance.search('ban');
// User keeps typing...
instance.search('banana');

// Only the last search is executed after 500ms
// instance.current will be ['banana']
```

## Implementation Notes

- The `search()` method is debounced (default: 300ms) to prevent excessive recalculations during typing
- Use `searchNow()` for immediate search without debouncing
- Setting `data`, `limit`, or calling `filter()` automatically resets to page 1
- The `goTo()` method uses 1-based indexing and clamps to valid page range
- `next()` and `prev()` are no-ops when at boundaries (won't throw errors)
- The `reset()` method clears search, resets to page 1, and restores the initial `filterFn`
- The `batch()` method allows multiple updates with only one recalculation (more efficient)
- All pages are recalculated when sorting, filtering, searching, or changing the limit
- The original `initialData` array is not mutated - internal copies are created
- Custom `searchFn` allows implementing domain-specific search logic
- The `searchTone` parameter can be used to control search sensitivity (if your search function uses it)
- `debounceMs` can be customized to adjust the debounce delay for the `search()` method
- The `pages()` generator lazily yields pages on-demand
- Both `Symbol.iterator` and `pages()` can be used to iterate through all pages

## See Also

- [search](./search.md): Fuzzy search functionality used internally.
- [sort](./sort.md): Functional sorting utility.
- [chunk](./chunk.md): Basic array splitting without state management.
