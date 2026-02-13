# Fetchit Usage Guide

Complete guide to installing and using Fetchit in your projects.

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

[[toc]]

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/fetchit
```

```sh [npm]
npm install @vielzeug/fetchit
```

```sh [yarn]
yarn add @vielzeug/fetchit
```

:::

## Import

```ts
import { createHttpClient, createQueryClient, HttpError } from '@vielzeug/fetchit';
```

## Basic Usage

### Two Ways to Use Fetchit

Fetchit provides flexible architecture with separate clients:

1. **HTTP Client** - Pure HTTP operations without query overhead
2. **Query Client** - Advanced caching and state management
3. **Use Together or Independently** - Mix and match based on your needs

### HTTP Client (Simple HTTP Requests)

The HTTP client provides clean REST API methods without caching overhead. Perfect for simple requests.

#### Creating an HTTP Client

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000, // 30 seconds (default: 30000)
  headers: {
    Authorization: 'Bearer token',
    'Content-Type': 'application/json',
  },
  dedupe: true, // Automatic request deduplication (default: true)
  logger: (level, msg, meta) => {
    // Optional: Custom logger for debugging
    console.log(`[${level.toUpperCase()}]`, msg, meta);
  },
});
```

**Options:**

- `baseUrl` - Base URL for all requests
- `timeout` - Request timeout in milliseconds (default: 30000)
- `headers` - Default headers for all requests
- `dedupe` - Enable request deduplication (default: true)
- `logger` - Optional logger function for debugging requests

#### Making Requests

```ts
// GET request - returns raw data
const user = await http.get<User>('/users/1');
console.log(user.name);

// POST request
const created = await http.post<User>('/users', {
  body: {
    name: 'Alice',
    email: 'alice@example.com',
  },
});

// PUT request
const updated = await http.put<User>('/users/1', {
  body: { name: 'Alice Smith' },
});

// PATCH request
const patched = await http.patch<User>('/users/1', {
  body: { email: 'newemail@example.com' },
});

// DELETE request
await http.delete('/users/1');

// Custom method
const data = await http.request<DataType>('CUSTOM', '/endpoint');
```

#### Query Parameters

```ts
const users = await http.get<User[]>('/users', {
  params: {
    role: 'admin',
    age: 18,
    page: 1,
  },
});
// Calls: /users?role=admin&age=18&page=1
```

### Request Deduplication

The HTTP client automatically deduplicates concurrent identical requests to prevent unnecessary network calls:

```ts
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  dedupe: true, // Default is true
});

// These 3 requests happen concurrently but only ONE network call is made
const [user1, user2, user3] = await Promise.all([http.get('/users/1'), http.get('/users/1'), http.get('/users/1')]);

// All three get the same response
console.log(user1 === user2); // true
```

Deduplication works with different body types:

```ts
// JSON bodies with same content dedupe (property order doesn't matter)
const [r1, r2] = await Promise.all([
  http.post('/data', { body: { name: 'Alice', age: 25 } }),
  http.post('/data', { body: { age: 25, name: 'Alice' } }), // Same content!
]);
// Only one request made ✅

// FormData, Blob, ArrayBuffer are treated specially
const formData = new FormData();
formData.append('file', file);

// All FormData uploads get the same dedupe key, so they dedupe together
const [upload1, upload2] = await Promise.all([
  http.post('/upload', { body: formData }),
  http.post('/upload', { body: formData }),
]);
// Only one upload ✅
```

::: tip 💡 Smart Deduplication
Fetchit uses stable serialization for request bodies, meaning property order doesn't affect deduplication. Binary data types (FormData, Blob, ArrayBuffer) are handled safely without crashing.
:::

#### Managing Headers

```ts
// Update headers dynamically
http.setHeaders({
  Authorization: `Bearer ${newToken}`,
});

// Remove a header
http.setHeaders({
  Authorization: undefined,
});

// Get current headers
const headers = http.getHeaders();
console.log(headers);
```

### Query Client (Advanced Caching)

The Query client provides intelligent caching, request deduplication, and state management. Works with any HTTP client or fetch function.

#### Creating a Query Client

```ts
import { createQueryClient, createHttpClient } from '@vielzeug/fetchit';

const queryClient = createQueryClient({
  cache: {
    staleTime: 5000, // Data fresh for 5 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    enabled: true,
  },
  refetch: {
    onFocus: true, // Refetch when window regains focus
    onReconnect: true, // Refetch when network reconnects
  },
});

// Use with HTTP client
const http = createHttpClient({ baseUrl: 'https://api.example.com' });
```

#### Type-Safe Query Keys

```ts
// Define query keys manually with `as const` for type safety
const queryKeys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    list: (filters: { role?: string }) => ['users', 'list', filters] as const,
  },
} as const;

// Type-safe and autocomplete works!
const user = await queryClient.fetch({
  queryKey: queryKeys.users.detail('123'),
  queryFn: () => http.get(`/users/123`),
});
```

#### Basic Query

```ts
// Fetch user with caching
const user = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get<User>(`/users/${userId}`),
  staleTime: 5000, // Fresh for 5 seconds
  gcTime: 60000, // Keep in cache for 60 seconds
});
```

#### Query with Parameters

```ts
// Query key includes all parameters that affect the data
async function fetchUsers(filters: { role?: string; age?: number }) {
  return queryClient.fetch({
    queryKey: ['users', filters], // Include filters in key
    queryFn: () => http.get<User[]>('/users', { params: filters }),
  });
}

const admins = await fetchUsers({ role: 'admin' });
const adults = await fetchUsers({ age: 18 });
```

#### Mutations (POST/PUT/DELETE)

```ts
// Create user
const newUser = await queryClient.mutate(
  {
    mutationFn: (userData: CreateUserInput) => http.post<User>('/users', { body: userData }),
    onSuccess: (data) => {
      // Invalidate users list to refetch
      queryClient.invalidate(['users']);
    },
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
  },
);
```

#### Optimistic Updates

```ts
// Update user optimistically
queryClient.setData<User>(['users', userId], (old) => ({
  ...old,
  name: 'Updated Name',
}));

try {
  await queryClient.mutate(
    {
      mutationFn: (updates) => http.put<User>(`/users/${userId}`, { body: updates }),
      onSuccess: () => {
        // Refetch to get server data
        queryClient.invalidate(['users', userId]);
      },
    },
    { name: 'Updated Name' },
  );
} catch (error) {
  // Rollback on error
  queryClient.invalidate(['users', userId]);
}
```

### Cache Management

```ts
// Invalidate specific query
queryClient.invalidate(['users', userId]);

// Manually set cache data
queryClient.setData(['users', 1], { id: 1, name: 'John' });

// Get cached data
const cachedUser = queryClient.getData(['users', 1]);

// Get query state (includes status, error, etc.)
const state = queryClient.getState(['users', 1]);
console.log(state?.status, state?.data);

// Subscribe to query changes
const unsubscribe = queryClient.subscribe(['users', userId], (state) => {
  console.log('User data changed:', state.data);
  console.log('Loading:', state.isLoading);
});

// Prefetch data
await queryClient.prefetch({
  queryKey: ['users', '2'],
  queryFn: () => http.get('/users/2'),
});

// Clear all cache
queryClient.clearCache();

// Get cache size
const size = queryClient.getCacheSize();
```

### Observable State

Subscribe to query state changes for real-time updates:

```ts
const unsubscribe = queryClient.subscribe(['users', userId], (state) => {
  console.log('Status:', state.status); // 'idle' | 'pending' | 'success' | 'error'
  console.log('Data:', state.data);
  console.log('Error:', state.error);
  console.log('Loading:', state.isLoading);
  console.log('Success:', state.isSuccess);
  console.log('HTTP Status:', state.httpStatus);
  console.log('HTTP OK:', state.httpOk);
});

// Don't forget to cleanup
unsubscribe();
```

### Stable Query Keys

Fetchit uses stable key serialization, meaning **property order doesn't matter** for cache matching. This prevents cache misses caused by object property ordering.

```ts
// These two queries use the SAME cache entry
const key1 = ['users', { page: 1, filter: 'active' }];
const key2 = ['users', { filter: 'active', page: 1 }]; // Different order!

await queryClient.fetch({
  queryKey: key1,
  queryFn: () => http.get('/users'),
});

// This will use the cached data from above
await queryClient.fetch({
  queryKey: key2, // Same logical key, different property order
  queryFn: () => http.get('/users'),
});

// Also works with nested objects
const nestedKey1 = ['posts', { filters: { status: 'published', author: 'john' }, page: 1 }];
const nestedKey2 = ['posts', { page: 1, filters: { author: 'john', status: 'published' } }];
// ✅ These match!
```

::: tip 💡 Stable Serialization
Fetchit automatically sorts object keys before serialization, ensuring consistent cache keys regardless of property order. This is especially useful when keys are built dynamically or come from different sources.
:::

## Common Patterns

### Query with Retry

```ts
import { createQueryClient, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

const user = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get<User>(`/users/${userId}`),
  retry: 3, // 3 retries = 4 total attempts (1 initial + 3 retries)
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// Disable retries
const data = await queryClient.fetch({
  queryKey: ['data'],
  queryFn: fetchData,
  retry: false, // No retries (1 attempt only)
});

// Or retry: 0 also means no retries
const data2 = await queryClient.fetch({
  queryKey: ['data2'],
  queryFn: fetchData,
  retry: 0, // No retries (1 attempt only)
});
```

::: tip 💡 Retry Semantics

- `retry: 3` means **3 retry attempts** (4 total attempts: 1 initial + 3 retries)
- `retry: 0` or `retry: false` means **no retries** (1 attempt only)
- Default is `retry: 3` for queries, `retry: false` for mutations
  :::

### Dependent Queries

```ts
// Fetch user first
const user = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get<User>(`/users/${userId}`),
});

// Then fetch their posts
const posts = await queryClient.fetch({
  queryKey: ['users', userId, 'posts'],
  queryFn: () => http.get<Post[]>(`/users/${userId}/posts`),
  enabled: !!user, // Only run if user exists
});
```

### Mutation with Invalidation

```ts
await queryClient.mutate(
  {
    mutationFn: (postData) => http.post<Post>('/posts', { body: postData }),
    onSuccess: () => {
      // Invalidate posts list to refetch
      queryClient.invalidate(['posts']);
      // Also invalidate user's posts
      queryClient.invalidate(['users', userId, 'posts']);
    },
  },
  postData,
);
```

## Advanced Features

### Canceling Requests with AbortController

You can cancel in-flight requests using AbortController:

```ts
const controller = new AbortController();

// Pass signal to HTTP client
const promise = http.get('/slow-endpoint', {
  signal: controller.signal,
});

// Cancel after 1 second
setTimeout(() => controller.abort(), 1000);

try {
  const data = await promise;
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Request was cancelled');
  }
}
```

When a query is aborted:

- The query state is set to `'idle'` (not `'error'`)
- The `error` field is cleared (set to `null`)
- The `onError` callback is **not called** (aborts are not errors)

```ts
const controller = new AbortController();

queryClient.fetch({
  queryKey: ['data'],
  queryFn: () => http.get('/data', { signal: controller.signal }),
  onError: (err) => {
    // This won't be called if request is aborted
    console.error('Actual error:', err);
  },
});

// Cancel the request
controller.abort(); // Query state becomes 'idle', not 'error'
```

::: tip 💡 Abort vs Error
Fetchit distinguishes between user-initiated aborts and actual errors. Aborted requests set the query status to `'idle'` with no error, while actual errors set the status to `'error'` with an error message.
:::

### Dynamic Headers

Update headers after client creation:

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Add or update headers
http.setHeaders({
  Authorization: 'Bearer new-token',
  'X-Custom-Header': 'value',
});

// Remove headers (set to undefined)
http.setHeaders({
  Authorization: undefined,
});

// Get current headers
const headers = http.getHeaders();
```

### Query Options

All available query options:

```ts
import { createQueryClient, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get<User>(`/users/${userId}`),

  // Caching
  staleTime: 5000, // Data fresh for 5 seconds
  gcTime: 60000, // Keep in cache for 60 seconds

  // Execution
  enabled: true, // Enable/disable query

  // Retry
  retry: 3, // Number of retries (or false)
  retryDelay: 1000, // Delay between retries (or function)

  // Refetching
  refetchOnFocus: false, // Refetch when window gains focus
  refetchOnReconnect: false, // Refetch when going online

  // Callbacks
  onSuccess: (data) => {
    console.log('Success:', data);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});
```

### Mutation Options

All available mutation options:

```ts
import { createQueryClient, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

await queryClient.mutate(
  {
    mutationFn: (userData) => http.post<User>('/users', { body: userData }),

    // Retry
    retry: false, // Don't retry mutations by default

    // Callbacks
    onSuccess: (data, variables) => {
      console.log('Created:', data);
    },
    onError: (error, variables) => {
      console.error('Failed:', error);
    },
    onSettled: (data, error, variables) => {
      // Always called (success or error)
    },
  },
  userData,
);
```

### Cache Management

```ts
import { createQueryClient } from '@vielzeug/fetchit';

const queryClient = createQueryClient();

// Invalidate specific query
queryClient.invalidate(['users', 1]);

// Set query data manually (optimistic updates)
queryClient.setData(['users', 1], { id: 1, name: 'John' });

// Update with function
queryClient.setData<User[]>(['users'], (old = []) => [...old, newUser]);

// Get cached data
const cachedUser = queryClient.getData(['users', 1]);

// Clear all cache
queryClient.clearCache();

// Get cache size
const size = queryClient.getCacheSize();
```

### URL Building

```ts
import { buildUrl } from '@vielzeug/fetchit';

const url = buildUrl('/api/users', {
  page: 1,
  limit: 10,
  active: true,
});
// Result: "/api/users?page=1&limit=10&active=true"
```

### Error Handling

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users/1');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`Request failed: ${error.method} ${error.url}`);
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
  }
}
```

### File Uploads

Fetchit automatically handles FormData:

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My file');

// Content-Type is set automatically by the browser
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

// URLSearchParams
const params = new URLSearchParams();
params.append('key', 'value');
await http.post('/form', { body: params });
```

## Configuration Options

### ContextProps

```ts
{
  url: string;                   // Base URL (required)
  timeout?: number;              // Request timeout in ms (default: 5000)
  headers?: Record<string, string | undefined>; // Default headers
  expiresIn?: number;            // Cache expiration in ms (default: 120000)
  params?: Record<string, string | number | undefined>; // Default query params
}
```

### RequestConfig

```ts
{
  id?: string;           // Custom cache key
  cancelable?: boolean;  // Cancel pending requests with same ID
  invalidate?: boolean;  // Force bypass cache
  body?: unknown;        // Request body
  headers?: HeadersInit; // Per-request headers
  // ...all standard RequestInit options
}
```

## Best Practices

1. **Create one client per API**: Don't create a new client for each request
2. **Use custom IDs for cache control**: Makes invalidation easier
3. **Handle errors properly**: Use HttpError for better debugging
4. **Clean up on logout**: Call `clearCache()` when user logs out
5. **Use TypeScript**: Define response types for better type safety

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> - Complete API documentation</li>
      <li><a href="./examples">Examples</a> - Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> - Try it in your browser</li>
    </ul>
  </div>
</div>
