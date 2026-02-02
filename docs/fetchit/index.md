# <img src="/logo-http.svg" alt="Fetchit" width="32" style="display: inline-block; vertical-align: middle; margin-right: 10px; margin-bottom: 10px;"> Fetchit

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-9.8_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Zero Dependencies">
</div>

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
    headers: { 'Content-Type': 'application/json' }
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

| Feature | Fetchit | Axios | Ky | Native Fetch |
|---------|---------|-------|-----|--------------|
| TypeScript Support | ✅ First-class | ✅ Good | ✅ Good | ⚠️ Basic |
| Request Deduplication | ✅ Built-in | ❌ | ❌ | ❌ |
| Smart Caching | ✅ Built-in | ⚠️ Via plugins | ❌ | ❌ |
| Auto JSON Parsing | ✅ | ✅ | ✅ | ⚠️ Manual |
| Timeout Support | ✅ Built-in | ✅ | ✅ | ⚠️ AbortController |
| Bundle Size (gzip) | ~9.8KB | ~13KB | ~4KB | 0KB |
| Node.js Support | ✅ | ✅ | ✅ | ✅ (v18+) |
| Dependencies | 0 | 7+ | 0 | N/A |
| Interceptors | ✅ | ✅ | ✅ Hooks | ❌ |

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
- **Smart Caching**: Built-in caching mechanism to reduce redundant network calls
- **Deduplication**: Automatically prevent concurrent identical requests
- **Auto Parsing**: Intelligent handling of JSON, text, and binary data
- **Interceptors**: Request and response interceptors for auth, logging, etc.
- **Modern Defaults**: Sensible timeouts, headers, and error handling out of the box
- **Zero Dependencies**: Lightweight and self-contained

## 🏁 Quick Start

### Installation

```sh
# pnpm (recommended)
pnpm add @vielzeug/fetchit

# npm
npm install @vielzeug/fetchit

# yarn
yarn add @vielzeug/fetchit
```

### Basic Usage

```ts
import { createFetchService } from '@vielzeug/fetchit';

// 1. Create a service instance with configuration
const api = createFetchService({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
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

// POST request
const created = await api.post<User>('/users', {
  name: 'Alice',
  email: 'alice@example.com'
});

// PUT request
const updated = await api.put<User>('/users/1', {
  name: 'Alice Smith'
});

// DELETE request
await api.delete('/users/1');
```

### Real-World Example: API Client

```ts
import { createFetchService } from '@vielzeug/fetchit';

// Create authenticated API client
const api = createFetchService({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

// Add auth interceptor
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${token}`
  };
  return config;
});

// Add error handling interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      return api.request(error.config);
    }
    throw error;
  }
);

// Use throughout your app
export const fetchUser = (id: string) => 
  api.get<User>(`/users/${id}`);

export const updateProfile = (data: Partial<User>) =>
  api.put<User>('/profile', data);
```

### Framework Integration: React

```tsx
import { createFetchService } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const api = createFetchService({
  baseURL: 'https://api.example.com'
});

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let cancelled = false;
    
    const fetchUser = async () => {
      try {
        const res = await api.get<User>(`/users/${userId}`);
        if (!cancelled) {
          setUser(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
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
  if (!user) return <div>User not found</div>;
  
  return <div>{user.name}</div>;
}
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Service configuration, interceptors, and error handling
- **[API Reference](./api.md)**: Complete documentation of all methods and options
- **[Examples](./examples.md)**: Patterns for caching, cancellation, and file uploads

## ❓ FAQ

### How is Fetchit different from Axios?

Fetchit is TypeScript-first with zero dependencies and built-in request deduplication. Axios has more plugins but larger bundle size and dependencies.

### Does Fetchit work in Node.js?

Yes! Fetchit works in both browser and Node.js (v18+ recommended for native fetch support).

### Can I use Fetchit with React Query or SWR?

Absolutely! Fetchit works great as the data fetching layer for these libraries.

### How do I handle file uploads?

```ts
const formData = new FormData();
formData.append('file', file);

await api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Is request deduplication automatic?

Yes! Concurrent identical requests are automatically deduplicated to prevent redundant network calls.

### How do I disable caching for specific requests?

```ts
await api.get('/users', { cache: 'no-cache' });
```

## 🐛 Troubleshooting

### CORS errors

**Problem**: Cross-origin requests blocked.

**Solution**: Ensure your server has proper CORS headers:
```ts
// Server-side (Express example)
app.use(cors({
  origin: 'https://your-domain.com',
  credentials: true
}));
```

### Timeout errors

**Problem**: Requests timeout unexpectedly.

**Solution**: Adjust timeout or use per-request timeout:
```ts
// Global timeout
const api = createFetchService({ timeout: 30000 });

// Per-request timeout
await api.get('/slow-endpoint', { timeout: 60000 });
```

### TypeScript type inference not working

**Problem**: Response data type not inferred.

**Solution**: Explicitly specify response type:
```ts
// ✅ Correct
const res = await api.get<User>('/users/1');

// ❌ Type is 'unknown'
const res = await api.get('/users/1');
```

### Request not cancelled on component unmount

**Problem**: Memory leaks from unmounted components.

**Solution**: Use AbortController:
```ts
const controller = new AbortController();

useEffect(() => {
  api.get('/users', { signal: controller.signal });
  
  return () => controller.abort();
}, []);
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

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

