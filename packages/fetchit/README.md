# @vielzeug/fetchit

Modern, type-safe HTTP client with intelligent caching, request deduplication, and query management for TypeScript.

## Features

- ✅ **Type-Safe** - Full TypeScript support with automatic type inference
- ✅ **Zero Dependencies** - Only requires `@vielzeug/toolkit` for retry logic
- ✅ **Lightweight** - ~3.5 KB gzipped
- ✅ **Smart Caching** - TanStack Query-inspired caching with stale-while-revalidate
- ✅ **Request Deduplication** - Prevents duplicate in-flight requests
- ✅ **Async Validation** - Built-in retry logic with exponential backoff
- ✅ **Abort Support** - Cancel requests with AbortController
- ✅ **Framework Agnostic** - Works anywhere JavaScript runs
- ✅ **Stable Keys** - Property order doesn't matter for cache matching

## Installation

```bash
# pnpm
pnpm add @vielzeug/fetchit

# npm
npm install @vielzeug/fetchit

# yarn
yarn add @vielzeug/fetchit
```

## Quick Start

### Simple HTTP Client

```typescript
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
});

// Make requests
const user = await http.get('/users/1');
const created = await http.post('/users', {
  body: { name: 'Alice', email: 'alice@example.com' }
});

// Update headers dynamically
http.setHeaders({ 'Authorization': 'Bearer new-token' });
```

### Query Client with Caching

```typescript
import { createQueryClient, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient({
  cache: { 
    staleTime: 5000,  // 5 seconds
    gcTime: 300000    // 5 minutes
  }
});

// Fetch with caching
const user = await queryClient.fetch({
  queryKey: ['users', 1],
  queryFn: () => http.get('/users/1'),
  staleTime: 5000,
  retry: 3
});

// Same request reuses cache
const sameUser = await queryClient.fetch({
  queryKey: ['users', 1],
  queryFn: () => http.get('/users/1')
}); // ✅ Returns cached data instantly
```

### Using Both Together

```typescript
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

// Create HTTP client for requests
const http = createHttpClient({ 
  baseUrl: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token' }
});

// Create query client for caching
const queryClient = createQueryClient({
  cache: { staleTime: 5000 }
});

// Use HTTP client for simple requests
await http.post('/analytics', { body: { event: 'click' } });

// Use query client for cached data fetching
await queryClient.fetch({
  queryKey: ['users'],
  queryFn: () => http.get('/users')
});

// Mutations with cache invalidation
await queryClient.mutate({
  mutationFn: (data) => http.post('/users', { body: data }),
  onSuccess: () => queryClient.invalidate(['users'])
}, { name: 'Charlie' });
```

## API Reference

### HTTP Client

#### `createHttpClient(options)`

Creates a simple HTTP client for making requests without caching overhead.

**Options:**
- `baseUrl?: string` - Base URL for all requests
- `headers?: Record<string, string>` - Default headers
- `timeout?: number` - Request timeout in milliseconds (default: 30000)
- `dedupe?: boolean` - Enable request deduplication (default: true)
- `logger?: (level, msg, meta) => void` - Custom logger function

**Methods:**
- `get(url, config?)` - GET request
- `post(url, config?)` - POST request
- `put(url, config?)` - PUT request
- `patch(url, config?)` - PATCH request
- `delete(url, config?)` - DELETE request
- `request(method, url, config?)` - Custom method
- `setHeaders(headers)` - Update default headers
- `getHeaders()` - Get current headers

**Example:**
```typescript
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
});

// GET request
const users = await http.get<User[]>('/users', {
  params: { page: 1, limit: 10 }
});

// POST with body
const created = await http.post<User>('/users', {
  body: { name: 'Alice', email: 'alice@example.com' }
});

// Custom headers per request
await http.get('/protected', {
  headers: { 'X-Custom-Header': 'value' }
});
```

---

### Query Client

#### `createQueryClient(options)`

Creates a query client with intelligent caching and state management.

**Options:**
- `staleTime?: number` - Time in ms before data is considered stale (default: 0)
- `gcTime?: number` - Time in ms before unused cache is garbage collected (default: 300000)
- `cache?: { staleTime?, gcTime? }` - Nested cache configuration
- `refetch?: { onFocus?, onReconnect? }` - Auto-refetch configuration

**Methods:**
- `fetch(options)` - Fetch data with caching
- `prefetch(options)` - Prefetch data (swallows errors)
- `mutate(options, variables)` - Execute mutations
- `invalidate(queryKey)` - Invalidate cached queries
- `setData(queryKey, data)` - Manually set cache data
- `getData(queryKey)` - Get cached data
- `getState(queryKey)` - Get query state
- `subscribe(queryKey, listener)` - Subscribe to query changes
- `unsubscribe(queryKey, listener)` - Unsubscribe from changes
- `clearCache()` - Clear all cached data
- `getCacheSize()` - Get number of cached entries

**Example:**
```typescript
const queryClient = createQueryClient({
  cache: { staleTime: 5000, gcTime: 300000 }
});

// Fetch with caching
const user = await queryClient.fetch({
  queryKey: ['users', 1],
  queryFn: () => fetch('/users/1').then(r => r.json()),
  staleTime: 5000,
  retry: 3,
  onSuccess: (data) => console.log('Loaded:', data),
  onError: (err) => console.error('Failed:', err)
});

// Subscribe to changes
const unsubscribe = queryClient.subscribe(['users', 1], (state) => {
  console.log('State:', state.status, state.data);
});

// Manually update cache
queryClient.setData(['users', 1], (old) => ({
  ...old,
  name: 'Updated Name'
}));

// Invalidate cache
queryClient.invalidate(['users']); // Invalidates all user queries
```

## Advanced Features

### Request Deduplication

Automatically prevents duplicate in-flight requests.

```typescript
const http = createHttpClient({ dedupe: true });

// These run concurrently but only make ONE request
const [user1, user2, user3] = await Promise.all([
  http.get('/users/1'),
  http.get('/users/1'),
  http.get('/users/1')
]);

// All three get the same response
console.log(user1 === user2 && user2 === user3); // true
```

### Retry Logic

Built-in retry with exponential backoff.

```typescript
await queryClient.fetch({
  queryKey: ['users'],
  queryFn: () => fetchUsers(),
  retry: 3, // Retry 3 times (4 attempts total)
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000)
});
```

### Abort Requests

Cancel requests with AbortController.

```typescript
const controller = new AbortController();

const promise = http.get('/slow-endpoint', {
  signal: controller.signal
});

// Cancel after 1 second
setTimeout(() => controller.abort(), 1000);

try {
  await promise;
} catch (err) {
  console.log('Request aborted');
}
```

### Cache Invalidation

Smart cache invalidation with prefix matching.

```typescript
// Cache some data
await queryClient.fetch({
  queryKey: ['users', 1],
  queryFn: () => fetchUser(1)
});

await queryClient.fetch({
  queryKey: ['users', 2],
  queryFn: () => fetchUser(2)
});

// Invalidate all user queries
queryClient.invalidate(['users']);

// Or invalidate specific user
queryClient.invalidate(['users', 1]);
```

### Stable Query Keys

Property order doesn't matter for cache matching.

```typescript
// These are treated as the same query
const key1 = ['users', { page: 1, filter: 'active' }];
const key2 = ['users', { filter: 'active', page: 1 }];

// Both use the same cache entry
await queryClient.fetch({ queryKey: key1, queryFn: fetchUsers });
await queryClient.fetch({ queryKey: key2, queryFn: fetchUsers }); // Uses cache
```

### Mutations

Execute mutations with optimistic updates and cache invalidation.

```typescript
await queryClient.mutate({
  mutationFn: async (data) => {
    return await http.post('/users', { body: data });
  },
  onSuccess: (newUser, variables) => {
    // Update cache optimistically
    queryClient.setData(['users'], (old = []) => [...old, newUser]);
  },
  onError: (error, variables) => {
    console.error('Mutation failed:', error);
  },
  onSettled: (data, error, variables) => {
    // Refetch to ensure consistency
    queryClient.invalidate(['users']);
  }
}, { name: 'Alice', email: 'alice@example.com' });
```

### Subscriptions

Subscribe to query state changes.

```typescript
const unsubscribe = queryClient.subscribe(['users', 1], (state) => {
  console.log('Status:', state.status);
  console.log('Data:', state.data);
  console.log('Error:', state.error);
  console.log('Loading:', state.isLoading);
  console.log('Success:', state.isSuccess);
});

// Later, unsubscribe
unsubscribe();
```

## TypeScript Support

Full TypeScript support with automatic type inference.

```typescript
import { createHttpClient, type Infer } from '@vielzeug/fetchit';

interface User {
  id: number;
  name: string;
  email: string;
}

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Type inference
const user = await http.get<User>('/users/1');
console.log(user.name); // ✅ Type-safe

// Mutation types
await queryClient.mutate<User, { name: string; email: string }>({
  mutationFn: async (vars) => {
    return await http.post<User>('/users', { body: vars });
  },
  onSuccess: (data) => {
    console.log(data.id); // ✅ Type-safe
  }
}, { name: 'Alice', email: 'alice@example.com' });
```

## Error Handling

Custom error class with detailed information.

```typescript
import { HttpError } from '@vielzeug/fetchit';

try {
  await http.get('/not-found');
} catch (err) {
  if (err instanceof HttpError) {
    console.log('URL:', err.url);          // '/not-found'
    console.log('Method:', err.method);    // 'GET'
    console.log('Status:', err.status);    // 404
    console.log('Original:', err.original); // Original error
  }
}
```

## Comparison with Alternatives

| Feature | fetchit | TanStack Query | SWR | axios |
|---------|---------|----------------|-----|-------|
| Bundle Size | **~3 KB** | ~15 KB | ~5 KB | ~13 KB |
| Dependencies | 1 (@vielzeug/toolkit) | 0 | 0 | Many |
| TypeScript | Native | Native | Good | Good |
| Caching | ✅ | ✅ | ✅ | ❌ |
| Request Deduplication | ✅ | ✅ | ✅ | ❌ |
| Stable Keys | ✅ | ❌ | ❌ | N/A |
| Retry Logic | ✅ | ✅ | ✅ | ✅ |
| Framework Agnostic | ✅ | ✅ | ❌ (React) | ✅ |
| Separate HTTP Client | ✅ | ❌ | ❌ | ✅ |
| Query Management | ✅ | ✅ | ✅ | ❌ |

## Best Practices

### Use HTTP Client for Simple Requests

When you don't need caching, use the HTTP client:

```typescript
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Simple one-off requests
await http.post('/analytics/event', { body: { event: 'click' } });
```

### Use Query Client for Data Fetching

When you need caching and state management:

```typescript
const queryClient = createQueryClient({ cache: { staleTime: 5000 } });
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Fetch and cache user data
await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get(`/users/${userId}`)
});
```

### Combine Both for Full-Featured Apps

Use HTTP client and query client together:

```typescript
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token' }
});

const queryClient = createQueryClient({
  cache: { staleTime: 5000 }
});

// HTTP client for simple requests
await http.post('/events', { body: event });

// Query client for cached data
await queryClient.fetch({
  queryKey: ['users'],
  queryFn: () => http.get('/users')
});

// Mutations with cache invalidation
await queryClient.mutate({
  mutationFn: (data) => http.post('/users', { body: data }),
  onSuccess: () => queryClient.invalidate(['users'])
}, userData);
```

### Optimize Cache Settings

```typescript
const queryClient = createQueryClient({
  cache: {
    staleTime: 5000,    // 5 seconds - how long data is fresh
    gcTime: 300000      // 5 minutes - how long to keep unused data
  }
});
```

## License

MIT

## Contributing

Contributions are welcome! Please read the [Contributing Guide](https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md).

## Credits

Inspired by [TanStack Query](https://tanstack.com/query) and [SWR](https://swr.vercel.app/).





