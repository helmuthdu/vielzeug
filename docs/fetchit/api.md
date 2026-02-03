# Fetchit API Reference

Complete API documentation for `@vielzeug/fetchit`.

## Core Functions

### `createHttpClient(context?)`

Creates a configured HTTP client instance.

**Parameters:**

- `context?: ContextProps` - Configuration object

**Returns:** HTTP client instance with methods

**Example:**

```ts
const api = createHttpClient({
  url: 'https://api.example.com',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});
```

### `buildUrl(baseUrl, params?)`

Builds a URL with query parameters.

**Parameters:**

- `baseUrl: string` - Base URL
- `params?: RequestParams` - Query parameters object

**Returns:** `string` - URL with query params

**Example:**

```ts
buildUrl('/users', { id: 1, active: true });
// Returns: "/users?id=1&active=true"
```

## HTTP Client Methods

All methods return `Promise<RequestResponse<T>>`.

### `get<T>(url, config?)`

Makes a GET request.

**Example:**

```ts
const res = await api.get<User>('/users/1');
console.log(res.data);
```

### `post<T>(url, config?)`

Makes a POST request.

**Example:**

```ts
const res = await api.post<User>('/users', {
  body: { name: 'Alice', email: 'alice@example.com' },
});
```

### `put<T>(url, config?)`

Makes a PUT request.

**Example:**

```ts
const res = await api.put<User>('/users/1', {
  body: { name: 'Alice Smith' },
});
```

### `patch<T>(url, config?)`

Makes a PATCH request.

**Example:**

```ts
const res = await api.patch<User>('/users/1', {
  body: { email: 'newemail@example.com' },
});
```

### `delete<T>(url, config?)`

Makes a DELETE request.

**Example:**

```ts
await api.delete('/users/1');
```

## Cache Management Methods

### `setHeaders(payload)`

Updates client headers. Headers with `undefined` values are removed.

**Parameters:**

- `payload: Record<string, string | undefined>` - Headers to set/remove

**Example:**

```ts
// Set headers
api.setHeaders({ Authorization: 'Bearer token123' });

// Remove headers
api.setHeaders({ Authorization: undefined });
```

### `clearCache()`

Clears all cached requests.

**Example:**

```ts
api.clearCache();
```

### `invalidateCache(idOrUrl)`

Invalidates a specific cache entry.

**Parameters:**

- `idOrUrl: string` - Cache key or request ID

**Returns:** `boolean` - True if entry was deleted

**Example:**

```ts
api.invalidateCache('user-123');
```

### `getCacheSize()`

Returns the number of cached requests.

**Returns:** `number`

**Example:**

```ts
const size = api.getCacheSize();
console.log(`Cache has ${size} entries`);
```

### `cleanupCache()`

Removes expired cache entries.

**Returns:** `number` - Number of entries removed

**Example:**

```ts
const removed = api.cleanupCache();
console.log(`Removed ${removed} expired entries`);
```

## Types

### `RequestConfig`

Request configuration options.

```ts
type RequestConfig = Omit<RequestInit, 'body'> & {
  id?: string; // Custom cache key
  cancelable?: boolean; // Cancel pending requests with same ID
  invalidate?: boolean; // Force bypass cache
  body?: unknown; // Request body (auto-serialized)
};
```

### `RequestResponse<T>`

Response object returned by all HTTP methods.

```ts
type RequestResponse<T> = {
  data: T; // Response data (typed)
  ok: boolean; // True if status is 2xx
  status: number; // HTTP status code
};
```

### `ContextProps`

Client configuration.

```ts
type ContextProps = {
  url: string; // Base URL (required)
  headers?: Record<string, string | undefined>; // Default headers
  timeout?: number; // Request timeout in ms (default: 5000)
  expiresIn?: number; // Cache expiration in ms (default: 120000)
  params?: Record<string, string | number | undefined>; // Default query params
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

### `RequestErrorType`

Common HTTP error status codes.

```ts
const RequestErrorType = {
  ABORTED: 499,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  NOT_ALLOWED: 405,
  NOT_FOUND: 404,
  PRE_CONDITION: 412,
  TIMEOUT: 408,
  UNAUTHORIZED: 401,
} as const;
```

### `RequestStatus`

Request status constants.

```ts
const RequestStatus = {
  ERROR: 'ERROR',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
} as const;
```

## Advanced Usage

### Custom Cache Keys

```ts
// Use custom ID for better cache control
await api.get<User>('/users/1', { id: 'user-1' });

// Later, invalidate this specific request
api.invalidateCache('user-1');
```

### Request Cancellation

```ts
// Cancel any pending request with the same ID
await api.get('/users', {
  id: 'users-list',
  cancelable: true,
});
```

### Cache Invalidation

```ts
// Force bypass cache for this request
await api.get('/users', { invalidate: true });
```

### FormData Support

```ts
const formData = new FormData();
formData.append('file', file);
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
