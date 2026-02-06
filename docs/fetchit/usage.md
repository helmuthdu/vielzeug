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
import { createHttpClient, buildUrl, HttpError } from '@vielzeug/fetchit';
```

## Basic Usage

### Creating a Client

```ts
const api = createHttpClient({
  url: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Making Requests

```ts
// GET
const res = await api.get<User>('/users/1');
console.log(res.data);

// POST
await api.post('/users', {
  body: { name: 'Alice', email: 'alice@example.com' },
});

// PUT
await api.put('/users/1', {
  body: { name: 'Alice Smith' },
});

// PATCH
await api.patch('/users/1', {
  body: { email: 'newemail@example.com' },
});

// DELETE
await api.delete('/users/1');
```

## Advanced Features

### Dynamic Headers

Update headers after client creation:

```ts
// Add or update headers
api.setHeaders({
  Authorization: 'Bearer token123',
  'X-Custom-Header': 'value',
});

// Remove headers (set to undefined)
api.setHeaders({
  Authorization: undefined,
});
```

### Cache Management

::: warning Cache Size
Be mindful of cache size in browser environments. Clear cache periodically in long-running applications.
:::

```ts
// Clear all cached requests
api.clearCache();

// Invalidate specific cache entry
api.invalidateCache('user-1');

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
