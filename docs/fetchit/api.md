# Fetchit API Reference

Complete API documentation for `@vielzeug/fetchit`.

## Core Functions

### `fetchit(options?)`

Creates a configured HTTP client instance with modern query management and caching.

**Parameters:**

- `options?: HttpClientOptions` - Configuration object
  - `baseUrl?: string` - Base URL for all requests
  - `headers?: Record<string, string>` - Default headers for all requests
  - `timeout?: number` - Request timeout in milliseconds (default: 30000)
  - `defaultStaleTime?: number` - Default stale time for queries in milliseconds (default: 0)
  - `defaultCacheTime?: number` - Default cache time in milliseconds (default: 300000)

**Returns:** HTTP client instance with query and REST methods

**Example:**

```ts
const api = fetchit({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  headers: { 'Authorization': 'Bearer token' },
  defaultStaleTime: 5000,
  defaultCacheTime: 300000,
});
```

## HTTP Client Methods

The client instance provides both modern query management methods and simple REST API methods.

### Query Management Methods

#### `query<T>(options)`

Execute a query with automatic caching, deduplication, and smart refetching.

**Parameters:**

- `options: QueryOptions<T>`
  - `queryKey: QueryKey` - Array-based unique identifier for the query (e.g., `['users', 1]`)
  - `queryFn: () => Promise<T>` - Async function that fetches the data
  - `staleTime?: number` - Time in ms before data is considered stale (default: 0)
  - `cacheTime?: number` - Time in ms before cached data is garbage collected (default: 300000)
  - `enabled?: boolean` - Whether the query should execute (default: true)
  - `retry?: number | false` - Number of retry attempts on failure (default: 3)
  - `retryDelay?: number | ((attemptIndex: number) => number)` - Delay between retries
  - `refetchOnFocus?: boolean` - Refetch when window regains focus (default: false)
  - `refetchOnReconnect?: boolean` - Refetch when network reconnects (default: false)
  - `onSuccess?: (data: T) => void` - Callback on successful fetch
  - `onError?: (error: Error) => void` - Callback on error

**Returns:** `Promise<T>` - The fetched data

**Example:**

```ts
const user = await api.query({
  queryKey: ['users', userId],
  queryFn: async () => {
    const res = await api.get(`/users/${userId}`);
    return res.data;
  },
  staleTime: 5000,
  cacheTime: 300000,
  retry: 3,
  refetchOnFocus: true,
  onSuccess: (data) => console.log('User loaded:', data),
});
```

#### `mutate<TData, TVariables>(options, variables)`

Execute a mutation (POST, PUT, PATCH, DELETE) with retry support and lifecycle callbacks.

**Parameters:**

- `options: MutationOptions<TData, TVariables>`
  - `mutationFn: (variables: TVariables) => Promise<TData>` - Async function to execute
  - `retry?: number | false` - Number of retry attempts (default: false)
  - `onSuccess?: (data: TData, variables: TVariables) => void` - Success callback
  - `onError?: (error: Error, variables: TVariables) => void` - Error callback
  - `onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void` - Always called
- `variables: TVariables` - Variables to pass to mutationFn

**Returns:** `Promise<TData>` - The mutation result

**Example:**

```ts
const newUser = await api.mutate(
  {
    mutationFn: async (data) => {
      const res = await api.post('/users', { body: data });
      return res.data;
    },
    retry: 1,
    onSuccess: (data) => {
      console.log('User created:', data);
      api.invalidateQueries(['users']);
    },
  },
  { name: 'Alice', email: 'alice@example.com' }
);
```

### REST API Methods

All REST methods return `Promise<RequestResponse<T>>`.

#### `get<T>(url, config?)`

Makes a GET request.

**Example:**

```ts
const res = await api.get<User>('/users/1');
console.log(res.data);
```

#### `post<T>(url, config?)`

Makes a POST request.

**Example:**

```ts
const res = await api.post<User>('/users', {
  body: { name: 'Alice', email: 'alice@example.com' },
});
```

#### `put<T>(url, config?)`

Makes a PUT request.

**Example:**

```ts
const res = await api.put<User>('/users/1', {
  body: { name: 'Alice Smith' },
});
```

#### `patch<T>(url, config?)`

Makes a PATCH request.

**Example:**

```ts
const res = await api.patch<User>('/users/1', {
  body: { email: 'newemail@example.com' },
});
```

#### `delete<T>(url, config?)`

Makes a DELETE request.

**Example:**

```ts
const res = await api.delete('/users/1');
```

### Cache Management Methods

#### `invalidateQueries(queryKey)`

Invalidates and removes a query from the cache. Also aborts any in-flight requests for this query.

**Parameters:**

- `queryKey: QueryKey` - The query key to invalidate

**Example:**

```ts
// Invalidate specific user
api.invalidateQueries(['users', 1]);

// Invalidate all users queries
api.invalidateQueries(['users']);
```

#### `setQueryData<T>(queryKey, data)`

Manually set or update data in the query cache.

**Parameters:**

- `queryKey: QueryKey` - The query key
- `data: T | ((old: T | undefined) => T)` - New data or updater function

**Example:**

```ts
// Set data directly
api.setQueryData(['users', 1], { id: 1, name: 'Alice' });

// Update existing data
api.setQueryData(['users', 1], (old) => ({ ...old, name: 'Alice Updated' }));
```

#### `getQueryData<T>(queryKey)`

Get cached data for a query.

**Parameters:**

- `queryKey: QueryKey` - The query key

**Returns:** `T | undefined` - Cached data or undefined

**Example:**

```ts
const user = api.getQueryData<User>(['users', 1]);
if (user) {
  console.log('Cached user:', user);
}
```

#### `subscribe(queryKey, listener)`

Subscribe to changes in a query's cache entry.

**Parameters:**

- `queryKey: QueryKey` - The query key to watch
- `listener: () => void` - Callback function called on changes

**Returns:** `() => void` - Unsubscribe function

**Example:**

```ts
const unsubscribe = api.subscribe(['users', 1], () => {
  console.log('User data changed');
});

// Later, unsubscribe
unsubscribe();
```

#### `unsubscribe(queryKey, listener)`

Manually unsubscribe a listener.

**Parameters:**

- `queryKey: QueryKey` - The query key
- `listener: () => void` - The listener to remove

**Example:**

```ts
const listener = () => console.log('Changed');
api.subscribe(['users', 1], listener);
api.unsubscribe(['users', 1], listener);
```

#### `clearCache()`

Clears all cached queries.

**Example:**

```ts
api.clearCache();
```

#### `getCacheSize()`

Returns the number of cached queries.

**Returns:** `number`

**Example:**

```ts
const size = api.getCacheSize();
console.log(`Cache has ${size} queries`);
```

### Header Management

#### `setHeaders(headers)`

Set or update global headers for all requests.

**Parameters:**

- `headers: Record<string, string | undefined>` - Headers to set (undefined removes header)

**Example:**

```ts
// Set headers
api.setHeaders({ Authorization: 'Bearer token123' });

// Remove header
api.setHeaders({ Authorization: undefined });
```

#### `getHeaders()`

Get current global headers.

**Returns:** `Record<string, string>`

**Example:**

```ts
const headers = api.getHeaders();
console.log(headers);
```

## Types

### `QueryKey`

Array-based unique identifier for queries.

```ts
type QueryKey = readonly unknown[];
```

**Examples:**

```ts
['users']
['users', 1]
['posts', { status: 'published' }]
['users', userId, 'posts']
```

### `QueryOptions<T>`

Configuration for query execution.

```ts
type QueryOptions<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  retry?: number | false;
  retryDelay?: number | ((attemptIndex: number) => number);
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};
```

### `MutationOptions<TData, TVariables>`

Configuration for mutation execution.

```ts
type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  retry?: number | false;
};
```

### `HttpClientOptions`

Client initialization options.

```ts
type HttpClientOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  defaultStaleTime?: number;
  defaultCacheTime?: number;
};
```

**Note:** Fetchit uses [@vielzeug/toolkit](../toolkit/index.md)'s utilities:
- **Cache Management**: Powered by [cache()](../toolkit/examples/function/cache.md)
- **Retry Logic**: Powered by [retry()](../toolkit/examples/function/retry.md)
- **Logging**: Powered by [@vielzeug/logit](../logit/index.md)

### `HttpRequestConfig`

Request configuration for REST methods.

```ts
type HttpRequestConfig = Omit<RequestInit, 'body'> & {
  body?: unknown; // Auto-serialized to JSON or passed as-is for FormData/Blob
  params?: Record<string, string | number | undefined>; // Query parameters
};
```

### `RequestResponse<T>`

Response object returned by all REST HTTP methods.

```ts
type RequestResponse<T> = {
  data: T; // Parsed response data
  ok: boolean; // True if status is 2xx
  status: number; // HTTP status code
};
```

### `HttpError`

Custom error class with request context.

```ts
class HttpError extends Error {
  readonly url: string;
  readonly method: string;
  readonly status?: number;
  readonly originalError?: unknown;
}
```

**Example:**

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users/1');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`${error.method} ${error.url} failed with status ${error.status}`);
  }
}
```

### `QueryStatus`

Query state enumeration.

```ts
type QueryStatus = 'idle' | 'pending' | 'success' | 'error';
```

## Advanced Usage

### Query Keys Best Practices

Use structured query keys for better cache management:

```ts
// User details
['users', userId]

// User posts
['users', userId, 'posts']

// Filtered posts
['posts', { status: 'published', author: userId }]

// Invalidate all user-related queries
api.invalidateQueries(['users']);
```

### Optimistic Updates

```ts
// Optimistically update cache before mutation
api.setQueryData(['users', userId], (old) => ({
  ...old,
  name: 'New Name',
}));

// Perform mutation
await api.mutate(
  {
    mutationFn: async (data) => {
      const res = await api.put(`/users/${userId}`, { body: data });
      return res.data;
    },
    onError: () => {
      // Revert on error
      api.invalidateQueries(['users', userId]);
    },
  },
  { name: 'New Name' }
);
```

### Stale-While-Revalidate Pattern

```ts
// Return stale data immediately, fetch fresh data in background
const user = await api.query({
  queryKey: ['users', userId],
  queryFn: async () => {
    const res = await api.get(`/users/${userId}`);
    return res.data;
  },
  staleTime: 5000, // Data is fresh for 5 seconds
  cacheTime: 300000, // Keep in cache for 5 minutes
});
```

### Custom Retry Strategies

Fetchit uses [@vielzeug/toolkit's retry()](../toolkit/examples/function/retry.md) utility under the hood, giving you powerful retry strategies:

```ts
// Exponential backoff (default)
await api.query({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: 3, // Retry 3 times
  // Default: 1s, 2s, 4s, 8s... (max 30s)
});

// Custom retry delay function
await api.query({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// Fixed delay
await api.query({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: 5,
  retryDelay: 2000, // Wait 2s between retries
});

// Disable retries
await api.query({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: false, // No retries
});
```

**How it works:**

- If `retryDelay` is a function, it's called with `attemptIndex - 1` (0-based)
- If `retryDelay` is a number, it's used as a fixed delay
- If `retryDelay` is undefined, exponential backoff is used (1s → 2s → 4s → 8s, max 30s)
- Retry requests respect the query's `AbortController` for cancellation

See [retry() documentation](../toolkit/examples/function/retry.md) for more details.

### Request Deduplication

```ts
// Multiple identical queries = single network request
const [user1, user2, user3] = await Promise.all([
  api.query({ queryKey: ['users', 1], queryFn: () => fetch('/users/1') }),
  api.query({ queryKey: ['users', 1], queryFn: () => fetch('/users/1') }),
  api.query({ queryKey: ['users', 1], queryFn: () => fetch('/users/1') }),
]);
// Only one actual fetch is made
```

### FormData and File Uploads

```ts
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'document.pdf');

// Automatically detected and handled correctly
await api.post('/upload', { body: formData });
```

### Binary Data

```ts
// Blob
const blob = new Blob(['content'], { type: 'text/plain' });
await api.post('/upload', { body: blob });

// ArrayBuffer
const buffer = new ArrayBuffer(8);
await api.post('/data', { body: buffer });
```

### Reactive Data with Subscriptions

```ts
// Subscribe to changes
const unsubscribe = api.subscribe(['users', userId], () => {
  const user = api.getQueryData(['users', userId]);
  console.log('User updated:', user);
});

// Trigger update
api.setQueryData(['users', userId], newUserData);

// Clean up
unsubscribe();
```

