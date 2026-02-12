<div class="badges">
  <img src="https://img.shields.io/badge/version-1.1.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-3.5_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-1-success" alt="Dependencies">
</div>

<img src="/logo-fetchit.svg" alt="Fetchit Logo" width="156" class="logo-highlight"/>

# Fetchit

**Fetchit** is a modern, type-safe HTTP client with intelligent caching and query management for browser and Node.js. Inspired by TanStack Query but significantly simpler, it provides separate HTTP and Query clients for maximum flexibility.

## What Problem Does Fetchit Solve?

Modern applications need more than just HTTP requests - they need intelligent caching, request deduplication, optimistic updates, and retry logic. Fetchit provides all of this out of the box with a clean, type-safe API.

**Traditional Approach**:

```ts
// Manual caching, deduplication, and error handling
const cache = new Map();
const pending = new Map();

async function fetchUser(id: number) {
  // Check cache
  if (cache.has(id)) return cache.get(id);

  // Deduplicate requests
  if (pending.has(id)) return pending.get(id);

  // Make request
  const promise = fetch(`/users/${id}`).then((r) => r.json());
  pending.set(id, promise);

  try {
    const data = await promise;
    cache.set(id, data);
    return data;
  } finally {
    pending.delete(id);
  }
}
```

**With Fetchit - Use HTTP client for simple requests**:

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const user = await http.get('/users/1');
```

**Or use Query client for advanced caching**:

```ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

const user = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get(`/users/${userId}`),
  staleTime: 5000, // Fresh for 5 seconds
});
```

### Comparison with Alternatives

| Feature               | Fetchit        | TanStack Query | Axios          | Native Fetch       |
| --------------------- | -------------- | -------------- | -------------- | ------------------ |
| TypeScript Support    | ✅ First-class | ✅ First-class | ✅ Good        | ⚠️ Basic           |
| Request Deduplication | ✅ Built-in    | ✅ Built-in    | ❌             | ❌                 |
| Smart Caching         | ✅ Built-in    | ✅ Built-in    | ⚠️ Via plugins | ❌                 |
| Stable Query Keys     | ✅ Built-in    | ❌             | N/A            | N/A                |
| Auto JSON Parsing     | ✅ Yes         | ❌ Manual      | ✅ Yes         | ⚠️ Manual          |
| Timeout Support       | ✅ Built-in    | ❌             | ✅ Built-in    | ⚠️ AbortController |
| Bundle Size (gzip)    | **~3 KB**      | ~15 KB         | ~13 KB         | 0 KB               |
| Node.js Support       | ✅ Yes         | ✅ Yes         | ✅ Yes         | ✅ (v18+)          |
| Dependencies          | 1              | 0              | 7+             | 0                  |
| Request Retry         | ✅ Built-in    | ✅ Built-in    | ⚠️ Via plugins | ❌                 |
| React Hooks           | ❌             | ✅ Yes         | ❌             | ❌                 |
| Framework Agnostic    | ✅ Yes         | ✅ Yes         | ✅ Yes         | ✅ Yes             |

## When to Use Fetchit

**✅ Use Fetchit when you:**

- Need smart caching without the complexity of TanStack Query
- Want a lightweight alternative to TanStack Query (~3.2 KB vs ~13 KB)
- Build TypeScript applications requiring full type safety
- Need automatic request deduplication to prevent redundant calls
- Want built-in caching and retry logic out of the box
- Prefer a framework-agnostic solution (no React dependency)
- Need both simple HTTP requests AND query management in one package

**❌ Consider alternatives when you:**

- Need React hooks integration (use TanStack Query directly)
- Already heavily invested in Axios ecosystem
- Need extremely minimal bundle size (use native fetch)
- Building simple scripts with few HTTP requests
- Need GraphQL-specific features

## 🚀 Key Features

- **Separate Clients**: HTTP client and Query client work independently
- **Type-Safe**: Full TypeScript support with generic types and inference
- **Smart Caching**: Built-in caching with configurable staleness and GC
- **Deduplication**: Automatically prevent concurrent identical requests
- **Stable Query Keys**: Property order doesn't matter for cache matching
- **Auto Parsing**: Intelligent handling of JSON, text, and binary data
- **Request Retry**: Automatic retry with exponential backoff
- **Observable State**: Subscribe to query changes for real-time updates
- **Prefix Invalidation**: `invalidate(['users'])` matches all user-related queries
- **Rich Error Context**: Custom HttpError class with URL, method, and status
- **Minimal Dependencies**: Only @vielzeug/toolkit for retry logic

## 🏁 Quick Start

### Installation

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

### Basic Usage

#### Option 1: HTTP Client Only (Simple)

```ts
import { createHttpClient } from '@vielzeug/fetchit';

// 1. Create HTTP client
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Make type-safe requests
interface User {
  id: string;
  name: string;
  email: string;
}

// GET request - returns raw data
const user = await http.get<User>('/users/1');
console.log(user.name); // Type-safe!

// POST request with body
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

// DELETE request
await http.delete('/users/1');
```

#### Option 2: Query Client for Advanced Caching

```ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

// 1. Create clients
const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient({
  cache: {
    staleTime: 5000,
    gcTime: 300000,
  },
});

// 2. Define type-safe query keys manually
const queryKeys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    list: (filters: { role?: string }) => ['users', 'list', filters] as const,
  },
} as const;

// 3. Fetch with caching
const user = await queryClient.fetch({
  queryKey: queryKeys.users.detail('1'),
  queryFn: () => http.get<User>('/users/1'),
  staleTime: 5000,
});

// 4. Mutations
await queryClient.mutate(
  {
    mutationFn: (newUser: Partial<User>) => http.post('/users', { body: newUser }),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidate(queryKeys.users.all());
    },
  },
  { name: 'Alice', email: 'alice@example.com' },
);
```

#### Option 3: Use Any Fetch Function with Query Client

```ts
import { createQueryClient } from '@vielzeug/fetchit';

const queryClient = createQueryClient();

// Use with native fetch
const data = await queryClient.fetch({
  queryKey: ['todos', '1'],
  queryFn: () => fetch('https://api.example.com/todos/1').then((r) => r.json()),
});

// Use with axios
import axios from 'axios';

const user = await queryClient.fetch({
  queryKey: ['users', '1'],
  queryFn: () => axios.get('/users/1').then((r) => r.data),
});
```

### Real-World Example: API Client with Auth

```ts
import { createHttpClient, createQueryClient, HttpError } from '@vielzeug/fetchit';

// Create HTTP client
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create query client for caching
const queryClient = createQueryClient({
  cache: { staleTime: 5000, gcTime: 300000 },
});

// Define type-safe query keys manually
export const queryKeys = {
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },
  profile: () => ['profile'] as const,
} as const;

// Update auth token dynamically
export function setAuthToken(token: string) {
  http.setHeaders({
    Authorization: `Bearer ${token}`,
  });
}

// Remove auth token (e.g., on logout)
export function clearAuth() {
  http.setHeaders({
    Authorization: undefined, // Removes the header
  });
  queryClient.clearCache(); // Clear cached authenticated requests
}

// Wrapper with error handling
async function apiRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  options?: { body?: unknown },
): Promise<T> {
  try {
    return await http[method]<T>(url, options);
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) {
        // Handle unauthorized - redirect to login
        window.location.href = '/login';
      }
      throw new Error(`Request failed: ${error.message}`);
    }
    throw error;
  }
}

// Use throughout your app with query caching
export const fetchUser = (id: string) =>
  queryClient.fetch({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => apiRequest<User>('get', `/users/${id}`),
  });

export const updateProfile = (data: Partial<User>) =>
  queryClient.mutate(
    {
      mutationFn: (vars: Partial<User>) => apiRequest<User>('put', '/profile', { body: vars }),
      onSuccess: () => queryClient.invalidate(queryKeys.profile()),
    },
    data,
  );
```

### Framework Integration: React

```tsx
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

function useUser(userId: string) {
  const [state, setState] = useState({
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  });

  useEffect(() => {
    const unsubscribe = queryClient.subscribe(['users', userId], (newState) => {
      setState({
        data: newState.data ?? null,
        isLoading: newState.isLoading,
        error: newState.error,
      });
    });

    queryClient
      .fetch({
        queryKey: ['users', userId],
        queryFn: () => http.get<User>(`/users/${userId}`),
        staleTime: 5000,
      })
      .catch(() => {});

    return () => unsubscribe();
  }, [userId]);

  return state;
}

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUser(userId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>User not found</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

## 🎓 Core Concepts

### HTTP Client

The foundational layer for making HTTP requests:

```ts
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
  headers: { Authorization: 'Bearer token' },
  dedupe: true, // Request deduplication (default: true)
});
```

Features: request/response interceptors, automatic retries, timeout handling, and request deduplication.

### Query Client

Advanced caching and state management for server data:

```ts
const queryClient = createQueryClient({
  cache: {
    staleTime: 5000, // How long data is fresh (default: 0)
    gcTime: 300000, // Garbage collection time (default: 5 minutes)
  },
  refetch: {
    onFocus: true, // Refetch when window regains focus
    onReconnect: true, // Refetch when network reconnects
  },
});
```

Features: automatic caching, background refetching, query invalidation, and optimistic updates.

### Query Keys

Unique identifiers for cached queries. Use arrays for type-safe, hierarchical keys:

```ts
const queryKeys = {
  users: {
    all: () => ['users'],
    detail: (id: string) => ['users', id],
    list: (filters: object) => ['users', 'list', filters],
  },
};
```

### Stale-While-Revalidate

Fetchit returns cached data immediately while fetching fresh data in the background:

- **staleTime**: How long data is considered fresh (no refetch if fresh)
- **gcTime**: How long unused data stays in cache before garbage collection

```ts
await queryClient.fetch({
  queryKey: ['users', '1'],
  queryFn: () => http.get('/users/1'),
  staleTime: 5000, // Fresh for 5 seconds
  gcTime: 300000, // Cache for 5 minutes
});
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Service configuration, interceptors, and error handling
- **[API Reference](./api.md)**: Complete documentation of all methods and options
- **[Examples](./examples.md)**: Patterns for caching, cancellation, and file uploads

## ❓ FAQ

### How is Fetchit different from TanStack Query?

Fetchit is inspired by TanStack Query but significantly simpler and lighter:

- **Smaller bundle**: ~3.2 KB vs ~13 KB (gzipped)
- **No React dependency**: Works with any framework (Vue, Svelte, vanilla JS)
- **Simpler API**: Fewer concepts, easier to learn
- **Built-in HTTP client**: No need for separate fetch library
- **No hooks**: Use with any framework or vanilla JS
- **Pattern invalidation**: Built-in prefix matching for cache invalidation

Use TanStack Query if you need React hooks integration. Use Fetchit for a simpler, framework-agnostic solution.

### How is Fetchit different from Axios?

Fetchit is TypeScript-first with modern caching built-in:

- **TypeScript**: First-class TypeScript support with full type inference
- **Smart caching**: Built-in query caching and deduplication
- **Smaller bundle**: ~3.2 KB vs ~13 KB (gzipped)
- **Modern**: Uses native fetch API under the hood
- **Pattern invalidation**: Powerful cache management

### Does Fetchit work in Node.js?

Yes! Fetchit works in both browser and Node.js (v18+ recommended for native fetch support).

### Can I use Fetchit with React Query or SWR?

Absolutely! Fetchit works great as the data fetching layer for these libraries.

### How do I handle file uploads?

Fetchit automatically detects FormData and handles it correctly:

```ts
const formData = new FormData();
formData.append('file', file);

// Content-Type is set automatically by the browser
await http.post('/upload', { body: formData });
```

### Is request deduplication automatic?

Yes! Concurrent identical requests are automatically deduplicated to prevent redundant network calls.

### How do I manage the cache?

Use the Query Client's built-in cache management methods powered by [@vielzeug/toolkit's cache()](../toolkit/examples/function/cache.md):

```ts
import { createQueryClient } from '@vielzeug/fetchit';

const queryClient = createQueryClient();

// Invalidate specific query (removes from cache and aborts in-flight requests)
queryClient.invalidate(['users', userId]);

// Manually set cache data
queryClient.setData(['users', 1], { id: 1, name: 'Alice' });

// Get cached data
const user = queryClient.getData(['users', 1]);

// Get query state
const state = queryClient.getState(['users', 1]);
console.log(state.status, state.data, state.error);

// Clear all cache
queryClient.clearCache();

// Get cache size
const size = queryClient.getCacheSize();

// Subscribe to cache changes
const unsubscribe = queryClient.subscribe(['users', userId], (state) => {
  console.log('User data changed:', state.data);
});
```

### How do I handle authentication tokens?

Use the HTTP client's `setHeaders` to update auth headers dynamically:

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Set token
http.setHeaders({ Authorization: `Bearer ${token}` });

// Remove token (set to undefined)
http.setHeaders({ Authorization: undefined });

// Get current headers
const headers = http.getHeaders();
```

## 🐛 Troubleshooting

### CORS errors

::: danger Problem
Cross-origin requests blocked.
:::

::: tip Solution
Ensure your server has proper CORS headers:

```ts
// Server-side (Express example)
app.use(
  cors({
    origin: 'https://your-domain.com',
    credentials: true,
  }),
);
```

:::

### TypeScript type inference not working

::: danger Problem
Response data type not inferred.
:::

::: tip Solution
Explicitly specify response type:

```ts
// ✅ Correct - returns data directly
const user = await http.get<User>('/users/1');
console.log(user.name); // Type-safe

// ❌ Type is 'unknown'
const user = await http.get('/users/1');
```

:::

### Request cancelled errors

**Problem**: Getting abort/cancellation errors.

**Solution**: Handle cancellation properly:

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await http.get('/users');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`${error.method} ${error.url} failed:`, error.message);
  }
}
```

### Cache not working as expected

**Problem**: Getting stale data or cache not invalidating.

**Solution**: Use Query Client cache management methods:

```ts
import { createQueryClient } from '@vielzeug/fetchit';

const queryClient = createQueryClient();

// Invalidate specific query to force refetch
queryClient.invalidate(['users', userId]);

// Invalidate all user queries
queryClient.invalidate(['users']);

// Clear all cache
queryClient.clearCache();

// Manually update cache
queryClient.setData(['users', userId], updatedData);
```

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/fetchit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/fetchit/CHANGELOG.md)

---

> **Tip:** Fetchit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for storage, logging, permissions, and more.
