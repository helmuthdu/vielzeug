<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2864_B-success" alt="Size">
</div>

# list

Creates a reactive, paginated list with filtering, sorting, and searching capabilities. Supports a subscription pattern for reactivity.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/list.ts
:::

## Features

- **Reactive**: Subscribe to changes with the observer pattern
- **Synchronous**: All operations execute immediately
- **Pagination**: Automatic chunking with configurable page size
- **Filtering**: Apply custom filter predicates
- **Built-in Fuzzy Search**: Automatic search across all object properties with a customizable search function
- **Debounced Search**: Search with optional immediate mode (300ms default debounce)
- **Sorting**: Custom sort functions with dynamic updates
- **Batch Updates**: Apply multiple changes efficiently in one operation
- **Rich Metadata**: Comprehensive pagination info (current page, total pages, isEmpty, etc.)
- **Isomorphic**: Works in both Browser and Node.js

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/array/list.ts#Meta

---

<<< @/../packages/toolkit/src/array/list.ts#List

---

<<< @/../packages/toolkit/src/array/list.ts#LocalConfig
:::

```ts
function list<T>(initialData: readonly T[], config?: LocalConfig<T>): List<T, Predicate<T>, Sorter<T>>;
```

### Parameters

- `initialData: readonly T[]` - The initial array of data to paginate
- `config?: LocalConfig<T>` - Optional configuration object (see type definition above for all available options)

### Returns

`List<T, Predicate<T>, Sorter<T>>` - A reactive paginated list instance (see type definition above for all available methods and properties)

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

### Built-in Fuzzy Search

```ts
import { list } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
  { name: 'Charlie Brown', email: 'charlie@test.com', role: 'user' },
];

const instance = list(users);

// Built-in search works across all object properties
instance.search('alice', { immediate: true });
console.log(instance.current);
// [{ name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' }]

// Search by email domain
instance.search('example.com', { immediate: true });
console.log(instance.current.length); // 2 (Alice and Bob)

// Case-insensitive fuzzy search
instance.search('CHARLIE', { immediate: true });
console.log(instance.current[0].name); // 'Charlie Brown'

// Debounced search (default)
instance.search('admin');
// After 300ms delay, results will update
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
instance.setFilter((user) => user.age > 25);
console.log(instance.current);
// [{ name: 'Bob', age: 30 }, { name: 'Charlie', age: 35 }]

// Debounced search (default, 300ms delay)
instance.search('Bob');
// After 300ms delay:
// instance.current will be [{ name: 'Bob', age: 30 }]

// Immediate search (no debounce)
instance.search('Charlie', { immediate: true });
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
instance.setSort((a, b) => a.name.localeCompare(b.name));
console.log(instance.current[0].name); // 'Alice'

// Sort by age descending
instance.setSort((a, b) => b.age - a.age);
console.log(instance.current[0].name); // 'Charlie'

// Remove sorting
instance.setSort();
console.log(instance.current[0].name); // 'Charlie' (original order)
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
instance.setData?.([4, 5, 6, 7, 8]);
console.log(instance.current); // [4, 5, 6, 7, 8]

// Change page size
instance.setLimit(2);
console.log(instance.current); // [4, 5]
console.log(instance.meta.pages); // 4

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
instance.search('query', { immediate: true });

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
instance.batch((ctx) => {
  ctx.setLimit(2);
  ctx.setFilter((x) => x % 2 === 0);
  ctx.setSort((a, b) => b - a);
  ctx.goTo(2);
});

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

instance.search('bob', { immediate: true });
console.log(instance.current);
// [{ name: 'Bob', email: 'bob@example.com' }]

instance.search('example.com', { immediate: true });
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

### Reactive Updates with Subscribe

```ts
import { list } from '@vielzeug/toolkit';

const data = [1, 2, 3, 4, 5];
const instance = list(data, { limit: 2 });

// Subscribe to changes
const unsubscribe = instance.subscribe(() => {
  console.log('Data changed!', instance.current);
  console.log('Page:', instance.meta.page);
});

instance.next();
// Logs: "Data changed! [3, 4]"
// Logs: "Page: 2"

instance.setLimit(3);
// Logs: "Data changed! [1, 2, 3]"
// Logs: "Page: 1"

// Unsubscribe when done
unsubscribe();

instance.next();
// No logs (unsubscribed)
```

### React Integration

```ts
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { List } from './list';
import { list as createList } from './list';
// Generic hook
export function useList<T>(initialData: readonly T[], config?: Parameters<typeof createList<T>>[1]) {
  const instRef = useRef<List<T>>();
  // Create once
  if (!instRef.current) {
    instRef.current = createList<T>(initialData, config);
  }
  // Reflect prop changes (optional)
  useEffect(() => {
    instRef.current!.data = initialData;
  }, [initialData]);
  useEffect(() => {
    if (config?.limit != null) instRef.current!.limit = config.limit;
    if (config?.sortFn) instRef.current!.sort(config.sortFn);
    if (config?.filterFn) instRef.current!.filter(config.filterFn);
  }, [config?.limit, config?.sortFn, config?.filterFn]);
  const subscribe = (cb: () => void) => instRef.current!.subscribe(cb);
  const snapshot = useSyncExternalStore(subscribe, () => ({
    current: instRef.current!.current,
    meta: instRef.current!.meta,
    // you can add other derived things here if needed
  }));
  return {
    ...snapshot,
    api: instRef.current!, // full list API (next, prev, search, batch, etc.)
  };
}
```

### Vue Integration

```ts
import { shallowRef, ref, onMounted, onUnmounted, watch } from 'vue';
import type { List } from './list';
import { list as createList } from './list';
export function useList<T>(initialData: readonly T[], config?: Parameters<typeof createList<T>>[1]) {
  const inst = shallowRef<List<T>>(createList<T>(initialData, config));
  const current = ref<readonly T[]>(inst.value.current);
  const meta = ref(inst.value.meta);
  let unsubscribe: (() => void) | undefined;
  onMounted(() => {
    unsubscribe = inst.value.subscribe(() => {
      current.value = inst.value.current;
      meta.value = inst.value.meta;
    });
  });
  onUnmounted(() => {
    unsubscribe?.();
  });
  // If initialData prop changes
  watch(
    () => initialData,
    (d) => {
      inst.value.data = d;
      // current/meta will update via subscribe
    },
    { deep: false },
  );
  return {
    current,
    meta,
    api: inst, // expose the full list API
  };
}
```

## Implementation Notes

- **All methods are synchronous**: Every mutation method executes immediately
- **Reactive by default**: Use `subscribe()` to listen for changes, returns an unsubscribe function
- **Built-in fuzzy search**: Automatically searches across all object properties when no custom searchFn is provided
- **Search is debounced by default**: Pass `{ immediate: true }` for instant execution (300ms default)
- **Setting data, limit, or filter resets to page 1** automatically
- **goTo() uses 1-based indexing** and clamps to valid page range
- **next() and prev() are safe**: They won't throw errors at boundaries
- **reset() restores initial state**: Clears search, resets to page 1, and restores initial `filterFn`
- **batch() is efficient**: Apply multiple updates with only one recalculation and notification
- **Original data is never mutated**: Internal copies are created
- **Custom searchFn**: Allows implementing domain-specific search logic (overrides built-in search)
- **searchTone parameter**: Controls search sensitivity (0-1 range, default: 0.5)

## See Also

- [search](./search.md): Fuzzy search functionality
- [sort](./sort.md): Functional sorting utility
- [chunk](./chunk.md): Basic array splitting without state management
