<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-3200_B-success" alt="Size">
</div>

# remoteList

Creates a reactive, server-side paginated list with automatic data fetching, caching, filtering, sorting, and searching. Perfect for handling large datasets with backend pagination.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/remoteList.ts
:::

## Features

- **Server-Side Pagination**: Fetches only the data needed for the current page
- **Automatic Caching**: Smart request caching to minimize server calls
- **Loading & Error States**: Built-in loading and error state management
- **Reactive**: Subscribe to changes with the observer pattern
- **Async Operations**: All mutations return promises for proper async handling
- **Debounced Search**: Search with optional immediate mode (300ms default debounce)
- **Request Deduplication**: Prevents duplicate in-flight requests
- **Filtering & Sorting**: Server-side filtering and sorting support
- **Batch Updates**: Apply multiple changes efficiently in one request
- **Cache Invalidation**: Manual cache clearing with `invalidate()` and `refresh()`
- **Rich Metadata**: Comprehensive pagination info including loading/error states
- **Isomorphic**: Works in both Browser and Node.js

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/array/remoteList.ts#RemoteMeta

---

<<< @/../packages/toolkit/src/array/remoteList.ts#RemoteList

---

<<< @/../packages/toolkit/src/array/remoteList.ts#RemoteConfig
:::

```ts
function remoteList<T, F = Record<string, unknown>, S = { key?: string; dir?: SortDir }>(
  config: RemoteConfig<T, F, S>,
): RemoteList<T, F, S>;
```

### Parameters

- `config: RemoteConfig<T, F, S>` - Configuration object with the following properties:
  - `fetch: (query: RemoteQuery<F, S>) => Promise<RemoteResult<T>>` - **Required**. Function to fetch data from server
  - `limit?: number` - Items per page (default: 10, minimum: 1)
  - `debounceMs?: number` - Debounce delay for search in milliseconds (default: 300)
  - `initialFilter?: F` - Initial filter state
  - `initialSort?: S` - Initial sort state

### Returns

`RemoteList<T, F, S>` - A reactive server-side paginated list instance

## Examples

### Basic Server-Side Pagination

```ts
import { remoteList } from '@vielzeug/toolkit';

// Define your fetch function
const fetchUsers = async (query) => {
  const params = new URLSearchParams({
    page: query.page,
    limit: query.limit,
    ...(query.search && { search: query.search }),
  });

  const response = await fetch(`/api/users?${params}`);
  const data = await response.json();

  return {
    items: data.users,
    total: data.total,
  };
};

// Create remote list instance
const users = remoteList({
  fetch: fetchUsers,
  limit: 20,
});

// Subscribe to changes
users.subscribe(() => {
  console.log('Data updated:', users.current);
  console.log('Loading:', users.meta.loading);
  console.log('Error:', users.meta.error);
});

// Navigate pages
await users.next();
await users.goTo(5);
await users.prev();
```

### With Filtering and Sorting

```ts
import { remoteList } from '@vielzeug/toolkit';

type UserFilter = {
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
};

type UserSort = {
  key: 'name' | 'email' | 'createdAt';
  dir: 'asc' | 'desc';
};

const fetchUsers = async (query) => {
  const params = new URLSearchParams({
    page: query.page,
    limit: query.limit,
  });

  if (query.filter?.role) params.append('role', query.filter.role);
  if (query.filter?.status) params.append('status', query.filter.status);
  if (query.sort?.key) params.append('sortBy', query.sort.key);
  if (query.sort?.dir) params.append('sortDir', query.sort.dir);

  const response = await fetch(`/api/users?${params}`);
  return await response.json();
};

const users = remoteList<User, UserFilter, UserSort>({
  fetch: fetchUsers,
  limit: 25,
  initialFilter: { status: 'active' },
  initialSort: { key: 'name', dir: 'asc' },
});

// Apply filters
await users.setFilter({ role: 'admin', status: 'active' });

// Change sorting
await users.setSort({ key: 'createdAt', dir: 'desc' });
```

### Search with Debouncing

```ts
import { remoteList } from '@vielzeug/toolkit';

const users = remoteList({
  fetch: fetchUsers,
  debounceMs: 500, // Wait 500ms after typing stops
});

// Debounced search (waits 500ms)
users.search('john');

// Immediate search (no debounce)
await users.search('jane', { immediate: true });
```

### Loading and Error States

```ts
import { remoteList } from '@vielzeug/toolkit';

const users = remoteList({
  fetch: async (query) => {
    const response = await fetch(`/api/users?page=${query.page}`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return await response.json();
  },
});

// Subscribe to state changes
users.subscribe(() => {
  if (users.meta.loading) {
    console.log('Loading...');
  } else if (users.meta.error) {
    console.error('Error:', users.meta.error);
  } else {
    console.log('Data:', users.current);
  }
});

// Trigger fetch
await users.refresh();
```

### Batch Updates

```ts
import { remoteList } from '@vielzeug/toolkit';

const products = remoteList({
  fetch: fetchProducts,
  limit: 20,
});

// Apply multiple changes in one request
await products.batch((ctx) => {
  ctx.setLimit(50);
  ctx.setFilter({ category: 'electronics' });
  ctx.setSort({ key: 'price', dir: 'asc' });
  ctx.setQuery('laptop');
  ctx.goTo(1);
});
// Only one server request is made with all parameters
```

### Cache Management

```ts
import { remoteList } from '@vielzeug/toolkit';

const items = remoteList({
  fetch: fetchItems,
});

// Refresh current page (clears cache for current query)
await items.refresh();

// Clear entire cache
items.invalidate();
await items.goTo(1); // Will fetch fresh data

// Reset to initial state and clear cache
await items.reset();
```

### Pagination Metadata

```ts
import { remoteList } from '@vielzeug/toolkit';

const users = remoteList({
  fetch: fetchUsers,
  limit: 10,
});

await users.refresh();

console.log(users.meta);
// {
//   page: 1,
//   pages: 10,
//   total: 95,
//   start: 1,
//   end: 10,
//   limit: 10,
//   isEmpty: false,
//   isFirst: true,
//   isLast: false,
//   loading: false,
//   error: null
// }
```

### React Integration Example

```tsx
import { remoteList } from '@vielzeug/toolkit';
import { useEffect, useState } from 'react';

function UserList() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    const list = remoteList({
      fetch: async (query) => {
        const res = await fetch(`/api/users?page=${query.page}&limit=${query.limit}`);
        return await res.json();
      },
      limit: 20,
    });

    const unsubscribe = list.subscribe(() => {
      setUsers(list.current);
      setMeta(list.meta);
    });

    return unsubscribe;
  }, []);

  if (meta?.loading) return <div>Loading...</div>;
  if (meta?.error) return <div>Error: {meta.error}</div>;

  return (
    <div>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      <button onClick={() => list.prev()} disabled={meta?.isFirst}>
        Previous
      </button>
      <span>
        Page {meta?.page} of {meta?.pages}
      </span>
      <button onClick={() => list.next()} disabled={meta?.isLast}>
        Next
      </button>
    </div>
  );
}
```

### Advanced: Custom Query Builder

```ts
import { remoteList } from '@vielzeug/toolkit';

type ProductFilter = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
};

type ProductSort = {
  key: 'name' | 'price' | 'rating' | 'sales';
  dir: 'asc' | 'desc';
};

const products = remoteList<Product, ProductFilter, ProductSort>({
  fetch: async (query) => {
    // Build query string from all parameters
    const params = new URLSearchParams({
      page: String(query.page),
      limit: String(query.limit),
    });

    if (query.search) params.append('q', query.search);
    if (query.filter?.category) params.append('category', query.filter.category);
    if (query.filter?.minPrice) params.append('minPrice', String(query.filter.minPrice));
    if (query.filter?.maxPrice) params.append('maxPrice', String(query.filter.maxPrice));
    if (query.filter?.inStock !== undefined) params.append('inStock', String(query.filter.inStock));
    if (query.sort?.key) {
      params.append('sortBy', query.sort.key);
      params.append('sortDir', query.sort.dir || 'asc');
    }

    const response = await fetch(`/api/products?${params}`);
    const data = await response.json();

    return {
      items: data.products,
      total: data.totalCount,
    };
  },
  limit: 24,
  debounceMs: 300,
  initialFilter: { inStock: true },
  initialSort: { key: 'sales', dir: 'desc' },
});

// Use it
await products.search('laptop');
await products.setFilter({ category: 'electronics', minPrice: 500, inStock: true });
await products.setSort({ key: 'price', dir: 'asc' });
```

## Implementation Notes

- **All methods are async**: Every mutation method returns a `Promise<void>` to handle server requests
- **Reactive by default**: Use `subscribe()` to listen for changes, returns an unsubscribe function
- **Automatic initial fetch**: Data is fetched on the first subscription if no data exists
- **Smart caching**: Identical queries are cached to prevent redundant server requests
- **Request deduplication**: In-flight requests are tracked to prevent duplicate fetches
- **Search is debounced by default**: Pass `{ immediate: true }` for instant search (300ms default)
- **Setting filters/sorts resets to page 1**: Ensures consistent behavior when filtering changes
- **goTo() uses 1-based indexing**: Pages start at 1, not 0
- **next() and prev() are safe**: They won't throw errors at boundaries
- **reset() clears cache**: Returns to initial state and clears all cached data
- **batch() is efficient**: Apply multiple updates with only one server request
- **Meta includes loading and error**: Use these to show loading spinners and error messages
- **invalidate() clears cache**: Use when you need to force fresh data on next fetch
- **refresh() refetches current page**: Clears cache for current query and fetches fresh data

## Differences from `list`

| Feature               | `list` (Local)        | `remoteList` (Server-Side)  |
| --------------------- | --------------------- | --------------------------- |
| Data Source           | In-memory array       | Server API                  |
| Operations            | Synchronous           | Asynchronous (promises)     |
| Loading State         | N/A                   | Built-in `meta.loading`     |
| Error State           | N/A                   | Built-in `meta.error`       |
| Caching               | N/A                   | Automatic request caching   |
| Initial Data          | Required              | Fetched on first subscribe  |
| setData()             | Available             | Not available (use refresh) |
| refresh()             | N/A                   | Refetches current page      |
| invalidate()          | N/A                   | Clears cache                |
| Search Implementation | Built-in fuzzy search | Server-defined              |
| Filter/Sort Logic     | Client-side           | Server-side                 |

## See Also

- [list](./list.md): Client-side pagination utility
- [search](./search.md): Fuzzy search functionality
- [filter](./filter.md): Array filtering utility
- [sort](./sort.md): Functional sorting utility

<style>
.badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.badges img {
  height: 20px;
}
</style>
