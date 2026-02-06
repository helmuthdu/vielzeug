# Fetchit Usage Guide

Complete guide to installing and using Fetchit in your projects.

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
import { fetchit, HttpError } from '@vielzeug/fetchit';
```

## Two Ways to Use Fetchit

Fetchit provides two APIs:

1. **Query API** - Modern query management with caching (recommended for data fetching)
2. **REST API** - Simple HTTP methods (recommended for quick requests)

## Query API (Recommended for Data Fetching)

The Query API provides intelligent caching, request deduplication, and optimistic updates.

### Basic Query

```ts
const client = fetchit({
  baseUrl: 'https://api.example.com',
  defaultStaleTime: 5000, // Data fresh for 5 seconds
});

// Fetch user with caching
const user = await client.query({
  queryKey: ['users', userId],
  queryFn: async () => {
    const response = await client.get(`/users/${userId}`);
    return response.data;
  },
  staleTime: 5000, // Fresh for 5 seconds
  cacheTime: 60000, // Keep in cache for 60 seconds
});
```

### Query with Parameters

```ts
// Query key includes all parameters that affect the data
async function fetchUsers(filters: { role?: string; age?: number }) {
  return client.query({
    queryKey: ['users', filters], // Include filters in key
    queryFn: async () => {
      const response = await client.get('/users', { params: filters });
      return response.data;
    },
  });
}

const admins = await fetchUsers({ role: 'admin' });
const adults = await fetchUsers({ age: 18 });
```

### Mutations (POST/PUT/DELETE)

```ts
// Create user
const newUser = await client.mutate({
  mutationFn: async (userData: CreateUserInput) => {
    const response = await client.post('/users', { body: userData });
    return response.data;
  },
  onSuccess: (data) => {
    // Invalidate users list to refetch
    client.invalidateQueries(['users']);
  },
}, {
  name: 'John Doe',
  email: 'john@example.com'
});
```

### Optimistic Updates

```ts
// Update user optimistically
client.setQueryData<User>(['users', userId], (old) => ({
  ...old,
  name: 'Updated Name'
}));

try {
  await client.mutate({
    mutationFn: async (updates) => {
      const response = await client.put(`/users/${userId}`, { body: updates });
      return response.data;
    },
    onSuccess: () => {
      // Refetch to get server data
      client.invalidateQueries(['users', userId]);
    }
  }, { name: 'Updated Name' });
} catch (error) {
  // Rollback on error
  client.invalidateQueries(['users', userId]);
}
```

### Cache Management

```ts
// Invalidate specific query
client.invalidateQueries(['users', userId]);

// Manually set cache data
client.setQueryData(['users', 1], { id: 1, name: 'John' });

// Get cached data
const cachedUser = client.getQueryData(['users', 1]);

// Clear all cache
client.clearCache();
```

## REST API (Simple HTTP Methods)

For simple requests without caching, use the REST methods directly.

### Creating a Client

```ts
const client = fetchit({
  baseUrl: 'https://api.example.com',
  timeout: 30000, // 30 seconds
  headers: {
    'Authorization': 'Bearer token',
  },
});
```

### Making REST Requests

```ts
// GET
const response = await client.get<User>('/users/1');
console.log(response.data);

// POST
await client.post('/users', {
  body: { name: 'Alice', email: 'alice@example.com' },
});

// PUT
await client.put('/users/1', {
  body: { name: 'Alice Smith' },
});

// PATCH
await client.patch('/users/1', {
  body: { email: 'newemail@example.com' },
});

// DELETE
await client.delete('/users/1');
```

## Common Patterns

### Query with Retry

```ts
const user = await client.query({
  queryKey: ['users', userId],
  queryFn: fetchUser,
  retry: 3, // Retry 3 times on failure
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

### Dependent Queries

```ts
// Fetch user first
const user = await client.query({
  queryKey: ['users', userId],
  queryFn: () => fetchUser(userId),
});

// Then fetch their posts
const posts = await client.query({
  queryKey: ['users', userId, 'posts'],
  queryFn: () => fetchUserPosts(userId),
  enabled: !!user, // Only run if user exists
});
```

### Mutation with Invalidation

```ts
await client.mutate({
  mutationFn: async (postData) => {
    const response = await client.post('/posts', { body: postData });
    return response.data;
  },
  onSuccess: () => {
    // Invalidate posts list to refetch
    client.invalidateQueries(['posts']);
    // Also invalidate user's posts
    client.invalidateQueries(['users', userId, 'posts']);
  },
}, postData);
```

## Advanced Features

### Dynamic Headers

Update headers after client creation:

```ts
// Add or update headers
client.setHeaders({
  Authorization: 'Bearer new-token',
  'X-Custom-Header': 'value',
});

// Remove headers (set to undefined)
client.setHeaders({
  Authorization: undefined,
});

// Get current headers
const headers = client.getHeaders();
```

### Query Options

All available query options:

```ts
await client.query({
  queryKey: ['users', userId],
  queryFn: fetchUser,
  
  // Caching
  staleTime: 5000,        // Data fresh for 5 seconds
  cacheTime: 60000,       // Keep in cache for 60 seconds
  
  // Execution
  enabled: true,          // Enable/disable query
  
  // Retry
  retry: 3,               // Number of retries (or false)
  retryDelay: 1000,       // Delay between retries (or function)
  
  // Refetching
  refetchOnFocus: false,  // Refetch when window gains focus
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
await client.mutate({
  mutationFn: createUser,
  
  // Retry
  retry: false,           // Don't retry mutations by default
  
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
}, userData);
```

### Cache Management

```ts
// Invalidate specific query
client.invalidateQueries(['users', 1]);

// Set query data manually (optimistic updates)
client.setQueryData(['users', 1], { id: 1, name: 'John' });

// Update with function
client.setQueryData<User[]>(['users'], (old = []) => [...old, newUser]);

// Get cached data
const cachedUser = client.getQueryData(['users', 1]);

// Clear all cache
client.clearCache();

// Get cache size
const size = client.getCacheSize();
```

// Check cache size
const size = api.getCacheSize();

// Clean up expired entries
api.clearExpiredCache();
```

const removed = api.cleanupCache();

### Custom Cache Keys

```ts
// Use custom ID for better cache control
await api.get('/users/1', { id: 'user-1' });

// Later, invalidate this specific request
api.invalidateCache('user-1');
```

### Request Cancellation

```ts
// Cancel pending requests with the same ID
await api.get('/users', {
  id: 'users-list',
  cancelable: true,
});

// The second request will cancel the first one
await api.get('/users', {
  id: 'users-list',
  cancelable: true,
});
```

### Force Cache Invalidation

```ts
// Bypass cache for this request
await api.get('/users', { invalidate: true });
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
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My file');

// Content-Type is set automatically by the browser
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

// URLSearchParams
const params = new URLSearchParams();
params.append('key', 'value');
await api.post('/form', { body: params });
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

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Examples](./examples.md) - Practical code examples
