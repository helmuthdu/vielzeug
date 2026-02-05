<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-9.8_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Zero Dependencies">
</div>

<img src="/logo-http.svg" alt="Fetchit Logo" width="156" style="margin: 2rem; float: right; display: block;"/>

# Fetchit

**Fetchit** is a modern, type-safe HTTP client for browser and Node.js. It provides a powerful, unified API for making requests with built-in support for caching, cancellation, timeouts, and more.

## What Problem Does Fetchit Solve?

The native `fetch` API is powerful but requires significant boilerplate for common tasks. Managing base URLs, timeouts, JSON parsing, error handling, and request cancellation becomes repetitive and error-prone.

**Without Fetchit**:

```ts
// Verbose fetch with manual error handling
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('https://api.example.com/users/1', {
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout');
  }
  throw error;
} finally {
  clearTimeout(timeout);
}
```

**With Fetchit**:

```ts
// Clean, type-safe, one-liner
const res = await api.get<User>('/users/1');
return res.data;
```

### Comparison with Alternatives

| Feature               | Fetchit        | Axios          | Ky        | Native Fetch       |
| --------------------- | -------------- | -------------- | --------- | ------------------ |
| TypeScript Support    | ✅ First-class | ✅ Good        | ✅ Good   | ⚠️ Basic           |
| Request Deduplication | ✅ Built-in    | ❌             | ❌        | ❌                 |
| Smart Caching         | ✅ Built-in    | ⚠️ Via plugins | ❌        | ❌                 |
| Auto JSON Parsing     | ✅             | ✅             | ✅        | ⚠️ Manual          |
| Timeout Support       | ✅ Built-in    | ✅             | ✅        | ⚠️ AbortController |
| Bundle Size (gzip)    | ~9.8KB         | ~13KB          | ~4KB      | 0KB                |
| Node.js Support       | ✅             | ✅             | ✅        | ✅ (v18+)          |
| Dependencies          | 0              | 7+             | 0         | N/A                |
| Request Retry         | ✅ Built-in    | ⚠️ Via plugins | ⚠️ Manual | ❌                 |

## When to Use Fetchit

**✅ Use Fetchit when you:**

- Build TypeScript applications requiring full type safety
- Need automatic request deduplication to prevent redundant calls
- Want built-in caching without external dependencies
- Require consistent API across browser and Node.js
- Need interceptors for auth tokens, logging, etc.
- Want sensible defaults (timeouts, JSON parsing, error handling)

**❌ Consider alternatives when you:**

- Need extremely minimal bundle size (use native fetch)
- Already heavily invested in Axios ecosystem
- Building simple scripts with few HTTP requests
- Need HTTP/2 server push or advanced streaming

## 🚀 Key Features

- **Unified API**: Consistent interface for GET, POST, PUT, PATCH, and DELETE
- **Type-safe**: Robust request and response typing with full TypeScript support
- **Smart Caching**: Built-in caching mechanism with cache management utilities
- **Deduplication**: Automatically prevent concurrent identical requests
- **Auto Parsing**: Intelligent handling of JSON, text, and binary data
- **Request Retry**: Automatic retry on network errors
- **Rich Error Context**: Custom HttpError class with URL, method, and status
- **Modern Defaults**: Sensible timeouts, headers, and error handling out of the box
- **Zero Dependencies**: Lightweight and self-contained

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

```ts
import { createHttpClient } from '@vielzeug/fetchit';

// 1. Create a service instance with configuration
const api = createHttpClient({
  url: 'https://api.example.com',
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

// GET request
const res = await api.get<User>('/users/1');
console.log(res.data.name); // Type-safe!

// POST request with body
const created = await api.post<User>('/users', {
  body: {
    name: 'Alice',
    email: 'alice@example.com',
  },
});

// PUT request
const updated = await api.put<User>('/users/1', {
  body: { name: 'Alice Smith' },
});

// DELETE request
await api.delete('/users/1');
```

### Real-World Example: API Client with Auth

```ts
import { createHttpClient, HttpError } from '@vielzeug/fetchit';

// Create authenticated API client
const api = createHttpClient({
  url: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Update auth token dynamically
export function setAuthToken(token: string) {
  api.setHeaders({
    Authorization: `Bearer ${token}`,
  });
}

// Remove auth token (e.g., on logout)
export function clearAuth() {
  api.setHeaders({
    Authorization: undefined, // Removes the header
  });
  api.clearCache(); // Clear cached authenticated requests
}

// Wrapper with error handling
async function apiRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  options?: { body?: unknown },
): Promise<T> {
  try {
    const res = await api[method]<T>(url, options);
    return res.data;
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

// Use throughout your app
export const fetchUser = (id: string) => apiRequest<User>('get', `/users/${id}`);

export const updateProfile = (data: Partial<User>) => apiRequest<User>('put', '/profile', { body: data });
```

### Framework Integration: React

```tsx
import { createHttpClient } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const api = createHttpClient({
  url: 'https://api.example.com',
});

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await api.get<User>(`/users/${userId}`, {
          // Use request ID for better caching
          id: `user-${userId}`,
        });

        if (!cancelled) {
          setUser(res.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch user'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Service configuration, interceptors, and error handling
- **[API Reference](./api.md)**: Complete documentation of all methods and options
- **[Examples](./examples.md)**: Patterns for caching, cancellation, and file uploads

## ❓ FAQ

### How is Fetchit different from Axios?

Fetchit is TypeScript-first with zero dependencies and built-in request deduplication and caching. Axios has a larger ecosystem but bigger bundle size and dependencies.

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
await api.post('/upload', { body: formData });
```

### Is request deduplication automatic?

Yes! Concurrent identical requests are automatically deduplicated to prevent redundant network calls.

### How do I manage the cache?

Use the built-in cache management methods:

```ts
// Clear all cached requests
api.clearCache();

// Invalidate a specific cache entry
api.invalidateCache('user-123');

// Get cache size
const size = api.getCacheSize();

// Clean up expired entries
const removed = api.cleanupCache();
```

### How do I handle authentication tokens?

Use `setHeaders` to update auth headers dynamically:

```ts
// Set token
api.setHeaders({ Authorization: `Bearer ${token}` });

// Remove token (set to undefined)
api.setHeaders({ Authorization: undefined });
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

### Timeout errors

::: danger Problem
Requests timeout unexpectedly.
:::

::: tip Solution
Adjust timeout globally or per-request:

```ts
// Global timeout
const api = createHttpClient({ timeout: 30000 });

// The default timeout is 5000ms (5 seconds)
```

:::

### TypeScript type inference not working

::: danger Problem
Response data type not inferred.
:::

::: tip Solution
Explicitly specify response type:

```ts
// ✅ Correct
const res = await api.get<User>('/users/1');
const user: User = res.data;

// ❌ Type is 'unknown'
const res = await api.get('/users/1');
```

:::

### Request cancelled errors

**Problem**: Getting abort/cancellation errors.

**Solution**: Handle cancellation properly:

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`${error.method} ${error.url} failed:`, error.message);
  }
}
````

### Cache not working as expected

**Problem**: Getting stale data or cache not invalidating.

**Solution**: Use cache management methods:

```ts
// Invalidate specific request
await api.get('/users/1', { invalidate: true });

// Clear all cache
api.clearCache();

// Manually invalidate by ID
api.invalidateCache('user-1');
```

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Duarte](https://github.com/helmuthdu)

---

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/fetchit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/fetchit/CHANGELOG.md)

---

> **Tip:** Fetchit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for storage, logging, permissions, and more.
