# Fetchit API Reference

Complete API documentation for `@vielzeug/fetchit` v2.

## Overview

Fetchit provides **two separate clients** for maximum flexibility:

1. **HTTP Client** (`createHttpClient`) - Pure HTTP operations without caching
2. **Query Client** (`createQueryClient`) - Advanced query management with caching

Use them together or independently based on your needs.

## Core Functions

### `createHttpClient(options?)`

Creates a pure HTTP client without query management. Perfect for simple HTTP requests without caching overhead.

**Parameters:**

- `options?: HttpClientOptions`
  - `baseUrl?: string` - Base URL for all requests
  - `headers?: Record<string, string>` - Default headers for all requests
  - `timeout?: number` - Request timeout in milliseconds (default: 30000)
  - `dedupe?: boolean` - Enable request deduplication (default: true)
  - `logger?: (level, msg, meta) => void` - Optional logger function for debugging

**Returns:** HTTP client instance with REST methods

**Example:**

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  headers: { Authorization: 'Bearer token' },
  dedupe: true,
  logger: (level, msg, meta) => {
    console.log(`[${level}]`, msg, meta);
  },
});

// Direct HTTP requests (returns raw data)
const user = await http.get('/users/1');
const created = await http.post('/users', { body: newUser });
```

**Available Methods:**

- `get<T>(url, config?): Promise<T>` - GET request
- `post<T>(url, config?): Promise<T>` - POST request
- `put<T>(url, config?): Promise<T>` - PUT request
- `patch<T>(url, config?): Promise<T>` - PATCH request
- `delete<T>(url, config?): Promise<T>` - DELETE request
- `request<T>(method, url, config?): Promise<T>` - Custom HTTP method
- `setHeaders(headers): void` - Update global headers
- `getHeaders(): Record<string, string>` - Get current headers

---

### `createQueryClient(options?)`

Creates a pure query management client. Works with any HTTP client or fetch function.

**Parameters:**

- `options?: QueryClientOptions`
  - `staleTime?: number` - Default stale time in ms (default: 0)
  - `gcTime?: number` - Default garbage collection time in ms (default: 300000)
  - `cache?: object` - Nested cache configuration (alternative)
    - `staleTime?: number` - Time before data is stale (default: 0)
    - `gcTime?: number` - Garbage collection time (default: 300000)
  - `refetch?: object` - Refetch configuration
    - `onFocus?: boolean` - Refetch on window focus (default: false)
    - `onReconnect?: boolean` - Refetch on reconnect (default: false)

> **Note:** Options can be flat (`staleTime`, `gcTime`) or nested (`cache.staleTime`, `cache.gcTime`). Both formats are supported.

**Returns:** Query client instance

**Example:**

```ts
import { createQueryClient, createHttpClient } from '@vielzeug/fetchit';

// Flat options (recommended)
const queryClient = createQueryClient({
  staleTime: 5000,
  gcTime: 300000,
});

// Nested options (also supported)
const queryClient = createQueryClient({
  cache: { staleTime: 5000, gcTime: 300000 },
});

// Use with HTTP client
const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const user = await queryClient.fetch({
  queryKey: ['users', 1],
  queryFn: () => http.get('/users/1'),
});

// Or with native fetch
const data = await queryClient.fetch({
  queryKey: ['data'],
  queryFn: () => fetch('/data').then((r) => r.json()),
});
```

**Available Methods:**

**Core Methods:**

- `fetch<T>(options): Promise<T>` - Execute a query with caching
- `mutate<TData, TVariables>(options, variables): Promise<TData>` - Execute a mutation
- `prefetch<T>(options): Promise<void>` - Prefetch a query
- `getData<T>(queryKey): T | undefined` - Get cached data
- `setData<T>(queryKey, data | updater): void` - Set/update cached data
- `getState<T>(queryKey): QueryState<T> | null` - Get full query state
- `invalidate(queryKey): void` - Invalidate query (supports pattern matching)
- `subscribe<T>(queryKey, listener): () => void` - Subscribe to query changes
- `unsubscribe<T>(queryKey, listener): void` - Unsubscribe from changes
- `clearCache(): void` - Clear all cached data
- `getCacheSize(): number` - Get number of cached queries

**Method Aliases (TanStack Query compatibility):**

- `fetchQuery<T>(options): Promise<T>` - Alias for `fetch()`
- `getQueryData<T>(queryKey): T | undefined` - Alias for `getData()`
- `setQueryData<T>(queryKey, data): void` - Alias for `setData()`
- `getQueryState<T>(queryKey): QueryState<T> | null` - Alias for `getState()`
- `invalidateQueries(queryKey): void` - Alias for `invalidate()`
- `prefetchQuery<T>(options): Promise<void>` - Alias for `prefetch()`

---

## Type-Safe Query Keys

While there's no built-in helper, you can create type-safe query keys using TypeScript's `as const`:

**Example:**

```ts
// Define query keys manually
const queryKeys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    list: (filters: { role?: string }) => ['users', 'list', filters] as const,
  },
  posts: {
    all: () => ['posts'] as const,
    detail: (id: number) => ['posts', id] as const,
  },
} as const;

// Type-safe usage - autocomplete works!
queryClient.fetch({
  queryKey: queryKeys.users.detail('123'),
  queryFn: () => http.get('/users/123'),
});

// Invalidate with type safety
queryClient.invalidate(queryKeys.users.all());

// Typo caught at compile time
queryClient.invalidateQueries(queryKeys.user.detail('123')); // ❌ Error!
```

---

## Query Client Methods

The Query Client provides caching and state management. Use it with any HTTP client or fetch function.

### `fetch<T>(options)`

Execute a query with automatic caching, deduplication, and smart refetching.

**Parameters:**

- `options: QueryOptions<T>`
  - `queryKey: QueryKey` - Array-based unique identifier (e.g., `['users', 1]`)
  - `queryFn: () => Promise<T>` - Function that fetches the data
  - `staleTime?: number` - Time in ms before data is stale (default: 0)
  - `gcTime?: number` - Time in ms before garbage collection (default: 300000)
  - `enabled?: boolean` - Whether to execute the query (default: true)
  - `retry?: number | false` - Number of retry attempts (default: 3)
  - `retryDelay?: number | ((attempt: number) => number)` - Delay between retries
  - `onSuccess?: (data: T) => void` - Success callback
  - `onError?: (error: Error) => void` - Error callback

**Returns:** `Promise<T>` - The fetched data

**Example:**

```ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

const user = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get(`/users/${userId}`),
  staleTime: 5000,
  gcTime: 300000,
  retry: 3,
  onSuccess: (data) => console.log('User loaded:', data),
});
```

### `mutate<TData, TVariables>(options, variables)`

Execute a mutation (POST, PUT, PATCH, DELETE) with retry support and lifecycle callbacks.

**Parameters:**

- `options: MutationOptions<TData, TVariables>`
  - `mutationFn: (variables: TVariables) => Promise<TData>` - Function to execute
  - `retry?: number | false` - Number of retry attempts (default: false)
  - `retryDelay?: number | ((attempt: number) => number)` - Delay between retries
  - `onSuccess?: (data: TData, variables: TVariables) => void` - Success callback
  - `onError?: (error: Error, variables: TVariables) => void` - Error callback
  - `onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void` - Always called
- `variables: TVariables` - Variables to pass to mutationFn

**Returns:** `Promise<TData>` - The mutation result

**Example:**

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

const newUser = await queryClient.mutate(
  {
    mutationFn: (data) => http.post<User>('/users', { body: data }),
    retry: 1,
    onSuccess: (data) => {
      console.log('User created:', data);
      queryClient.invalidate(['users']);
    },
  },
  { name: 'Alice', email: 'alice@example.com' },
);
```

---

## HTTP Client Methods

All HTTP client methods return `Promise<T>` - the raw data directly (not wrapped in a response object).

> **🔥 Automatic Deduplication:** All HTTP requests are automatically deduplicated by default. Concurrent identical requests (same URL, method, and body) will share the same network call. Disable per-request with `{ dedupe: false }`.

### `get<T>(url, config?)`

Makes a GET request and returns the data directly.

**Config Options:**

- `params?: Record<string, string | number | undefined>` - Query parameters
- `dedupe?: boolean` - Enable/disable deduplication (default: true)
- `signal?: AbortSignal` - AbortSignal for request cancellation

**Example:**

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

const user = await http.get<User>('/users/1');
console.log(user.name); // Direct access

// Concurrent requests are automatically deduped
const [u1, u2, u3] = await Promise.all([http.get('/users/1'), http.get('/users/1'), http.get('/users/1')]);
// Only 1 network request made!
```

### `post<T>(url, config?)`

Makes a POST request and returns the data directly.

**Example:**

```ts
const user = await http.post<User>('/users', {
  body: { name: 'Alice', email: 'alice@example.com' },
});
console.log(user.id); // Direct access
```

### `put<T>(url, config?)`

Makes a PUT request and returns the data directly.

**Example:**

```ts
const user = await http.put<User>('/users/1', {
  body: { name: 'Alice Smith' },
});
console.log(user); // Updated user
```

### `patch<T>(url, config?)`

Makes a PATCH request.

**Example:**

```ts
const user = await http.patch<User>('/users/1', {
  body: { email: 'newemail@example.com' },
});
```

### `delete<T>(url, config?)`

Makes a DELETE request.

**Example:**

```ts
await http.delete('/users/1');
```

### `request<T>(method, url, config?)`

Makes a request with a custom HTTP method. Useful for less common methods like OPTIONS, HEAD, etc.

**Parameters:**

- `method: string` - HTTP method (e.g., 'OPTIONS', 'HEAD')
- `url: string` - Request URL
- `config?: HttpRequestConfig` - Request configuration

**Returns:** `Promise<T>`

**Example:**

```ts
// OPTIONS request
const corsInfo = await http.request<CorsInfo>('OPTIONS', '/users');

// HEAD request to check if resource exists
await http.request('HEAD', '/users/1');
```

### `setHeaders(headers)`

Update global headers for all future requests.

**Parameters:**

- `headers: Record<string, string | undefined>` - Headers to set (undefined removes header)

**Example:**

```ts
// Set auth token
http.setHeaders({ Authorization: `Bearer ${token}` });

// Remove auth token
http.setHeaders({ Authorization: undefined });
```

### `getHeaders()`

Get current global headers.

**Returns:** `Record<string, string>`

**Example:**

```ts
const headers = http.getHeaders();
console.log(headers.Authorization);
```

---

## Query Client Cache Management

### `invalidate(queryKey)` / `invalidateQueries(queryKey)`

Invalidates and removes queries from cache. Supports pattern matching!

> **Note:** `invalidateQueries` is an alias for `invalidate` (TanStack Query compatibility).

**Pattern Matching:**

- Exact match: `['users', '1']` matches only `['users', '1']`
- Prefix match: `['users']` matches `['users']`, `['users', '1']`, `['users', 'list', {...}]`, etc.

**Example:**

```ts
// Invalidate specific user
queryClient.invalidate(['users', '1']);

// Invalidate ALL user queries (pattern matching!)
queryClient.invalidate(['users']);
// Matches: ['users'], ['users', '1'], ['users', 'list', {...}], etc.
```

### `setData<T>(queryKey, data)`

Manually set or update data in the query cache.

**Parameters:**

- `queryKey: QueryKey` - The query key
- `data: T | ((old: T | undefined) => T)` - New data or updater function

**Example:**

```ts
// Set data directly
queryClient.setData(['users', '1'], { id: '1', name: 'Alice' });

// Update existing data
queryClient.setData(['users', '1'], (old) => ({ ...old, name: 'Alice Updated' }));
```

### `getData<T>(queryKey)`

Get cached data for a query.

**Parameters:**

- `queryKey: QueryKey` - The query key

**Returns:** `T | undefined` - Cached data or undefined

**Example:**

```ts
const user = queryClient.getData<User>(['users', '1']);
if (user) {
  console.log('Cached user:', user);
}
```

### `getState<T>(queryKey)`

Get the full state of a query including status, error, and metadata.

**Parameters:**

- `queryKey: QueryKey` - The query key

**Returns:** `QueryState<T> | null` - Query state object or null if not found

**QueryState Type:**

```ts
{
  data: T | undefined;
  error: Error | null;
  status: 'idle' | 'pending' | 'success' | 'error';
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchedAt: number;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
}
```

**Example:**

```ts
const state = queryClient.getState<User>(['users', '1']);
if (state) {
  console.log('Status:', state.status);
  console.log('Is loading:', state.isLoading);
  console.log('Data:', state.data);
  console.log('Last updated:', new Date(state.dataUpdatedAt));
}
```

#### `prefetchQuery<T>(options)`

Prefetch a query to warm up the cache without consuming the result. Useful for loading data before it's needed. Errors are silently ignored.

**Parameters:**

- `options: QueryOptions<T>` - Same as `query()` options

**Returns:** `Promise<void>`

**Example:**

```ts
import { createQueryClient, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

// Prefetch user data when hovering over a link
onMouseEnter={() => {
  queryClient.prefetch({
    queryKey: ['users', userId],
    queryFn: () => http.get<User>(`/users/${userId}`),
  });
});

// Later when navigating, data is already cached
const user = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get<User>(`/users/${userId}`),
});
```

#### `subscribe(queryKey, listener)`

Subscribe to changes in a query's cache entry. The listener receives the full query state on every change.

**Parameters:**

- `queryKey: QueryKey` - The query key to watch
- `listener: (state: QueryState<T>) => void` - Callback function called with state on changes

**State Object:**

```ts
{
  data: T | undefined;
  error: Error | null;
  status: 'idle' | 'pending' | 'success' | 'error';
  httpStatus?: number;
  httpOk?: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchedAt: number;
}
```

**Returns:** `() => void` - Unsubscribe function

**Example:**

````ts
import { createQueryClient } from '@vielzeug/fetchit';

const queryClient = createQueryClient();

// Subscriber receives state automatically
const unsubscribe = queryClient.subscribe(['users', 1], (state) => {
  if (state.isLoading) {
    showSpinner();
  } else if (state.isSuccess) {
    console.log('User:', state.data);
    console.log('HTTP Status:', state.httpStatus);
  } else if (state.isError) {
    showError(state.error);
  }
});

// Later, unsubscribe
unsubscribe();

// React example
useEffect(() => {
  return queryClient.subscribe(['users', userId], (state) => {
    setUser(state.data);
    setLoading(state.isLoading);
  });
}, [userId]);
```### `subscribe<T>(queryKey, listener)`

Subscribe to query state changes. Returns an unsubscribe function.

**Parameters:**

- `queryKey: QueryKey` - The query key to watch
- `listener: (state: QueryState<T>) => void` - Callback invoked on state changes

**Returns:** `() => void` - Unsubscribe function

**Example:**

```ts
// Subscribe to changes
const unsubscribe = queryClient.subscribe(['users', userId], (state) => {
  console.log('User changed:', state.data);
  console.log('Loading:', state.isLoading);
  console.log('Error:', state.error);
});

// Clean up when done
unsubscribe();
````

**React Hook Example:**

```tsx
useEffect(() => {
  return queryClient.subscribe(['users', userId], (state) => {
    setUser(state.data);
    setLoading(state.isLoading);
  });
}, [userId]);
```

### `unsubscribe<T>(queryKey, listener)`

Manually unsubscribe a listener (alternative to using the returned function).

**Parameters:**

- `queryKey: QueryKey` - The query key
- `listener: (state: QueryState<T>) => void` - The listener to remove

**Example:**

```ts
const listener = (state) => console.log('Changed:', state);
queryClient.subscribe(['users', '1'], listener);
queryClient.unsubscribe(['users', '1'], listener);
```

### `clearCache()`

Clears all cached queries and aborts in-flight requests.

**Example:**

```ts
queryClient.clearCache();
```

### `getCacheSize()`

Returns the number of cached queries.

**Returns:** `number`

**Example:**

```ts
const size = queryClient.getCacheSize();
console.log(`Cache has ${size} queries`);
```

### `prefetch<T>(options)`

Prefetch a query without consuming the result. Useful for warming the cache.

**Parameters:**

- `options: QueryOptions<T>` - Same as `fetch()` options

**Returns:** `Promise<void>`

**Example:**

```ts
// Prefetch user data before navigation
await queryClient.prefetch({
  queryKey: ['users', '2'],
  queryFn: () => http.get('/users/2'),
});
```

---

## Types

### `QueryKey`

Array-based unique identifier for queries.

```ts
type QueryKey = readonly unknown[];
```

**Examples:**

```ts
['users'][('users', 1)][('posts', { status: 'published' })][('users', userId, 'posts')];
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
import { HttpError, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

try {
  await http.get('/users/1');
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
['users', userId][
  // User details
  ('users', userId)
][
  // User posts
  ('users', userId, 'posts')
][
  // Filtered posts
  ('posts', { status: 'published', author: userId })
];

// Invalidate all user-related queries
queryClient.invalidate(['users']);
```

### Optimistic Updates

```ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

// Optimistically update cache before mutation
queryClient.setData(['users', userId], (old) => ({
  ...old,
  name: 'New Name',
}));

// Perform mutation
await queryClient.mutate(
  {
    mutationFn: (data) => http.put<User>(`/users/${userId}`, { body: data }),
    onError: () => {
      // Revert on error
      queryClient.invalidate(['users', userId]);
    },
  },
  { name: 'New Name' },
);
```

### Stale-While-Revalidate Pattern

```ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

// Return stale data immediately, fetch fresh data in background
const user = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get<User>(`/users/${userId}`),
  staleTime: 5000, // Data is fresh for 5 seconds
  gcTime: 300000, // Keep in cache for 5 minutes
});
```

### Custom Retry Strategies

Fetchit uses [@vielzeug/toolkit's retry()](../toolkit/examples/function/retry.md) utility under the hood, giving you powerful retry strategies:

```ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

// Exponential backoff (default)
await queryClient.fetch({
  queryKey: ['users'],
  queryFn: () => http.get<User[]>('/users'),
  retry: 3, // Retry 3 times
  // Default: 1s, 2s, 4s, 8s... (max 30s)
});

// Custom retry delay function
await queryClient.fetch({
  queryKey: ['users'],
  queryFn: () => http.get<User[]>('/users'),
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// Fixed delay
await queryClient.fetch({
  queryKey: ['users'],
  queryFn: () => http.get<User[]>('/users'),
  retry: 5,
  retryDelay: 2000, // Wait 2s between retries
});

// Disable retries
await queryClient.fetch({
  queryKey: ['users'],
  queryFn: () => http.get<User[]>('/users'),
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
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

// Multiple identical queries = single network request
const [user1, user2, user3] = await Promise.all([
  queryClient.fetch({ queryKey: ['users', 1], queryFn: () => http.get<User>('/users/1') }),
  queryClient.fetch({ queryKey: ['users', 1], queryFn: () => http.get<User>('/users/1') }),
  queryClient.fetch({ queryKey: ['users', 1], queryFn: () => http.get<User>('/users/1') }),
]);
// Only one actual fetch is made, all receive the same result
```

### FormData and File Uploads

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'document.pdf');

// Automatically detected and handled correctly
await http.post('/upload', { body: formData });
```

### Binary Data

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Blob
const blob = new Blob(['content'], { type: 'text/plain' });
await http.post('/upload', { body: blob });

// ArrayBuffer
const buffer = new ArrayBuffer(8);
await http.post('/data', { body: buffer });
```

### Reactive Data with Subscriptions

```ts
import { createQueryClient } from '@vielzeug/fetchit';

const queryClient = createQueryClient();

// Subscribe to changes
const unsubscribe = queryClient.subscribe(['users', userId], () => {
  const user = queryClient.getData(['users', userId]);
  console.log('User updated:', user);
});

// Trigger update
queryClient.setData(['users', userId], newUserData);

// Clean up
unsubscribe();
```
