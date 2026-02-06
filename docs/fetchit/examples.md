# Fetchit Examples

Practical examples showing common use cases and patterns with the new separate client architecture.

## Basic CRUD Operations with HTTP Client

### GET Request

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
});

interface User {
  id: string;
  name: string;
  email: string;
}

// Returns data directly
const user = await http.get<User>('/users/1');
console.log(user.name); // Direct access
console.log(user.email);
```

### POST Request

```ts
const user = await http.post<User>('/users', {
  body: {
    name: 'Alice',
    email: 'alice@example.com',
  },
});

console.log('Created user:', user); // Direct access
```

### PUT Request

```ts
const user = await http.put<User>('/users/1', {
  body: {
    name: 'Alice Smith',
    email: 'alice.smith@example.com',
  },
});

console.log('Updated user:', user);
```

### PATCH Request

```ts
const user = await http.patch<User>('/users/1', {
  body: { email: 'newemail@example.com' },
});

console.log('Updated email:', user.email);
```

### DELETE Request

```ts
await http.delete('/users/1');
// Returns void or deletion confirmation
```

## Authentication

### Setting Auth Headers

```ts
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
});

// After login
function login(token: string) {
  http.setHeaders({
    Authorization: `Bearer ${token}`,
  });
}

// On logout
function logout() {
  http.setHeaders({
    Authorization: undefined, // Removes the header
  });
  queryClient.clearCache(); // Clear cached authenticated data
}
```

### Auth Token Refresh

```ts
import { HttpError, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

async function apiRequest<T>(method: 'get' | 'post' | 'put' | 'delete', url: string, options?: any): Promise<T> {
  try {
    return await http[method]<T>(url, options);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      // Token expired, refresh it
      const newToken = await refreshAuthToken();
      http.setHeaders({ Authorization: `Bearer ${newToken}` });

      // Retry the request
      return await http[method]<T>(url, options);
    }
    throw error;
  }
}
```

## Cache Management

### Query Keys

```ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

// Use query keys for better cache control
const user = await queryClient.fetch({
  queryKey: ['users', '1'],
  queryFn: () => http.get<User>('/users/1'),
});

// Later, invalidate this specific query
queryClient.invalidate(['users', '1']);
```

### Request Deduplication

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// HTTP client automatically deduplicates identical concurrent requests
const [user1, user2, user3] = await Promise.all([
  http.get<User>('/users/1'),
  http.get<User>('/users/1'),
  http.get<User>('/users/1'),
]);

console.log(user1 === user2); // true (same instance)
```

### Force Refresh

```ts
// Invalidate cache first, then fetch fresh data
queryClient.invalidate(['users', '1']);
const freshUser = await queryClient.fetch({
  queryKey: ['users', '1'],
  queryFn: () => http.get<User>('/users/1'),
});
```

### Cache Cleanup

```ts
// Remove all cached queries
queryClient.clearCache();

// Get cache size
const size = queryClient.getCacheSize();
console.log(`Cache has ${size} queries`);

// Invalidate specific queries
queryClient.invalidate(['users', '1']);

// Invalidate all user queries (pattern matching)
queryClient.invalidate(['users']);

// Check cache size
console.log(`Cache contains ${size} entries`);
```

## URL Building

### Query Parameters

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Use params option for query parameters
const users = await http.get<User[]>('/api/users', {
  params: {
    page: 1,
    limit: 10,
    sort: 'name',
    active: true,
  },
});
// Actual request: "/api/users?page=1&limit=10&sort=name&active=true"
```

### Dynamic URLs

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

function getUser(id: string) {
  return http.get<User>(`/users/${id}`);
}

function searchUsers(query: string, page: number) {
  return http.get<User[]>('/users/search', {
    params: { q: query, page },
  });
}
```

## File Uploads

### Single File Upload

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

const fileInput = document.querySelector<HTMLInputElement>('#file');
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Profile picture');

await http.post('/upload', {
  body: formData,
  // Content-Type is set automatically
});
```

### Multiple Files

```ts
const formData = new FormData();
for (const file of files) {
  formData.append('files[]', file);
}

await http.post('/upload/multiple', {
  body: formData,
});
```

### Progress Tracking

```ts
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  const percent = (e.loaded / e.total) * 100;
  console.log(`Upload progress: ${percent}%`);
});

// For progress tracking, you may need to use XMLHttpRequest
// Fetchit focuses on simplicity over advanced upload features
```

## Error Handling

### Basic Error Handling

```ts
import { HttpError, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

try {
  const user = await http.get<User>('/users/1');
  console.log(user);
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`${error.method} ${error.url} failed`);
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
  } else {
    console.error('Network error:', error);
  }
}
```

### Status Code Handling

```ts
import { HttpError } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

try {
  await http.get('/users/1');
} catch (error) {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 404:
        console.error('User not found');
        break;
      case 401:
        console.error('Not authenticated');
        redirectToLogin();
        break;
      case 403:
        console.error('No permission');
        break;
      default:
        console.error('Request failed');
    }
  }
}
```

### Global Error Handler

```ts
import { HttpError, createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

async function safeRequest<T>(requestFn: () => Promise<T>): Promise<T | null> {
  try {
    return await requestFn();
  } catch (error) {
    if (error instanceof HttpError) {
      // Log to error tracking service
      trackError({
        url: error.url,
        method: error.method,
        status: error.status,
        message: error.message,
      });

      // Show user-friendly message
      showNotification('Something went wrong. Please try again.');
    }
    return null;
  }
}

// Usage
const user = await safeRequest(() => http.get<User>('/users/1'));
```

## Framework Integration

### React Hook

```tsx
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
});

const queryClient = createQueryClient();

function useUser(userId: string) {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const user = await queryClient.fetch({
          queryKey: ['users', userId],
          queryFn: () => http.get<User>(`/users/${userId}`),
        });

        if (!cancelled) {
          setData(user);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed'));
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

  return { data, loading, error };
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useUser(userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return <div>{user.name}</div>;
}
```

### Vue Composable

```ts
import { createHttpClient } from '@vielzeug/fetchit';
import { ref, watchEffect } from 'vue';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
});

export function useUser(userId: Ref<string>) {
  const data = ref<User | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  watchEffect(async () => {
    try {
      loading.value = true;
      const user = await http.get<User>(`/users/${userId.value}`);
      data.value = user;
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed');
    } finally {
      loading.value = false;
    }
  });

  return { data, loading, error };
}
```

### SvelteKit

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
});

// +page.server.ts
export async function load({ params }) {
  const user = await http.get<User>(`/users/${params.id}`);
  return {
    user,
  };
}
```

## Advanced Patterns

### Retry Logic

Fetchit uses [@vielzeug/toolkit's retry()](../toolkit/examples/function/retry.md) utility for intelligent retry logic with exponential backoff:

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

// Query with automatic retry
const user = await queryClient.fetch({
  queryKey: ['users', userId],
  queryFn: () => http.get<User>(`/users/${userId}`),
  retry: 3, // Retry 3 times with exponential backoff (1s, 2s, 4s)
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
});

// Mutation with retry
await queryClient.mutate(
  {
    mutationFn: (data) => http.post<User>('/users', { body: data }),
    retry: 2, // Retry POST operations 2 times
  },
  { name: 'Alice' }
);

// Custom fixed retry delay
const data = await queryClient.fetch({
  queryKey: ['status'],
  queryFn: () => http.get('/status'),
  retry: 5,
  retryDelay: 2000, // Fixed 2s delay between retries
});
```

### Polling

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

function startPolling(interval: number, onData: (data: any) => void) {
  const pollId = setInterval(async () => {
    try {
      // Invalidate to force refetch
      queryClient.invalidate(['status']);
      const data = await queryClient.fetch({
        queryKey: ['status'],
        queryFn: () => http.get('/status'),
      });
      onData(data);
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, interval);

  return () => clearInterval(pollId);
}

// Usage
const stopPolling = startPolling('/status', 5000, (status) => {
  console.log('Status update:', status);
});

// Later: stopPolling();
```

### Batch Requests

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

async function batchFetch<T>(ids: string[]): Promise<T[]> {
  const requests = ids.map((id) => http.get<T>(`/users/${id}`));
  return await Promise.all(requests);
}

// Usage
const users = await batchFetch<User>(['1', '2', '3']);
```
