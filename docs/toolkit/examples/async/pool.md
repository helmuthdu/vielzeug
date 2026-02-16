<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.5KB-success" alt="Size">
</div>

# pool

Create a promise pool that limits the number of concurrent promises. Useful for rate limiting API calls or controlling resource usage.

## Signature

```typescript
function pool(limit: number): <T>(fn: () => Promise<T>) => Promise<T>;
```

## Parameters

- `limit` – Maximum number of concurrent promises

## Returns

Function that accepts a promise-returning function and executes it when a slot is available.

## Examples

### Basic Usage

```typescript
import { pool } from '@vielzeug/toolkit';
const requestPool = pool(3);
const results = await Promise.all([
  requestPool(() => fetch('/api/1')),
  requestPool(() => fetch('/api/2')),
  requestPool(() => fetch('/api/3')),
  requestPool(() => fetch('/api/4')), // Waits for a slot
  requestPool(() => fetch('/api/5')), // Waits for a slot
]);
```

### Reusable Pool

```typescript
import { pool } from '@vielzeug/toolkit';
const apiPool = pool(5);
async function fetchUser(id: number) {
  return apiPool(() => fetch(`/api/users/${id}`).then((r) => r.json()));
}
async function fetchPost(id: number) {
  return apiPool(() => fetch(`/api/posts/${id}`).then((r) => r.json()));
}
// Both use the same pool (max 5 concurrent requests total)
const [users, posts] = await Promise.all([
  Promise.all([1, 2, 3].map(fetchUser)),
  Promise.all([1, 2, 3].map(fetchPost)),
]);
```

### Rate Limiting External API

```typescript
import { pool } from '@vielzeug/toolkit';
// Limit to 10 concurrent requests to external API
const externalApiPool = pool(10);
const data = await Promise.all(
  largeDataset.map((item) =>
    externalApiPool(async () => {
      const response = await fetch(`https://api.example.com/data/${item.id}`);
      return response.json();
    }),
  ),
);
```

### Mixed Operations

```typescript
import { pool } from '@vielzeug/toolkit';
const resourcePool = pool(3);
// Pool handles any async operations
const results = await Promise.all([
  resourcePool(() => queryDatabase()),
  resourcePool(() => fetch('/api/data')),
  resourcePool(() => readFile('./data.json')),
  resourcePool(() => processLargeFile()),
]);
```

## Related

- [parallel](./parallel.md) – Process arrays with controlled concurrency
- [queue](./queue.md) – Task queue with additional features
