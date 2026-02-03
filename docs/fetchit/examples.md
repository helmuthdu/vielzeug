# Fetchit Examples

Practical examples showing common use cases and patterns.

## Basic CRUD Operations

### GET Request

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const api = createHttpClient({
  url: 'https://api.example.com',
});

interface User {
  id: string;
  name: string;
  email: string;
}

const res = await api.get<User>('/users/1');
console.log(res.data.name);
console.log(res.ok);      // true if 2xx status
console.log(res.status);  // HTTP status code
```

### POST Request

```ts
const res = await api.post<User>('/users', {
  body: {
    name: 'Alice',
    email: 'alice@example.com'
  }
});

console.log('Created user:', res.data);
```

### PUT Request

```ts
const res = await api.put<User>('/users/1', {
  body: {
    name: 'Alice Smith',
    email: 'alice.smith@example.com'
  }
});
```

### PATCH Request

```ts
const res = await api.patch<User>('/users/1', {
  body: { email: 'newemail@example.com' }
});
```

### DELETE Request

```ts
await api.delete('/users/1');
```

## Authentication

### Setting Auth Headers

```ts
const api = createHttpClient({
  url: 'https://api.example.com',
});

// After login
function login(token: string) {
  api.setHeaders({
    Authorization: `Bearer ${token}`
  });
}

// On logout
function logout() {
  api.setHeaders({
    Authorization: undefined  // Removes the header
  });
  api.clearCache();  // Clear cached authenticated data
}
```

### Auth Token Refresh

```ts
import { HttpError } from '@vielzeug/fetchit';

async function apiRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  options?: any
): Promise<T> {
  try {
    const res = await api[method]<T>(url, options);
    return res.data;
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      // Token expired, refresh it
      const newToken = await refreshAuthToken();
      api.setHeaders({ Authorization: `Bearer ${newToken}` });
      
      // Retry the request
      const res = await api[method]<T>(url, options);
      return res.data;
    }
    throw error;
  }
}
```

## Cache Management

### Custom Cache Keys

```ts
// Use custom ID for better cache control
await api.get<User>('/users/1', {
  id: 'user-1'
});

// Later, invalidate this specific request
api.invalidateCache('user-1');
```

### Request Deduplication

```ts
// These will only make ONE network request
const [user1, user2, user3] = await Promise.all([
  api.get<User>('/users/1'),
  api.get<User>('/users/1'),
  api.get<User>('/users/1'),
]);

console.log(user1.data === user2.data); // true
```

### Canceling Pending Requests

```ts
// The second request will cancel the first one
await api.get('/users', {
  id: 'users-list',
  cancelable: true
});

// This cancels the previous request
await api.get('/users', {
  id: 'users-list',
  cancelable: true
});
```

### Force Refresh

```ts
// Bypass cache and make a fresh request
await api.get('/users/1', {
  invalidate: true
});
```

### Cache Cleanup

```ts
// Remove all cached requests
api.clearCache();

// Remove only expired entries
const removed = api.cleanupCache();
console.log(`Cleaned up ${removed} expired entries`);

// Check cache size
const size = api.getCacheSize();
console.log(`Cache contains ${size} entries`);
```

## URL Building

### Query Parameters

```ts
import { buildUrl } from '@vielzeug/fetchit';

const url = buildUrl('/api/users', {
  page: 1,
  limit: 10,
  sort: 'name',
  active: true
});
// Result: "/api/users?page=1&limit=10&sort=name&active=true"

// Use in requests
const res = await api.get<User[]>(url);
```

### Dynamic URLs

```ts
function getUser(id: string) {
  return api.get<User>(`/users/${id}`);
}

function searchUsers(query: string, page: number) {
  const url = buildUrl('/users/search', { q: query, page });
  return api.get<User[]>(url);
}
```

## File Uploads

### Single File Upload

```ts
const fileInput = document.querySelector<HTMLInputElement>('#file');
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Profile picture');

await api.post('/upload', {
  body: formData
  // Content-Type is set automatically
});
```

### Multiple Files

```ts
const formData = new FormData();
for (const file of files) {
  formData.append('files[]', file);
}

await api.post('/upload/multiple', {
  body: formData
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
import { HttpError } from '@vielzeug/fetchit';

try {
  const res = await api.get<User>('/users/1');
  console.log(res.data);
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
import { RequestErrorType } from '@vielzeug/fetchit';

try {
  await api.get('/users/1');
} catch (error) {
  if (error instanceof HttpError) {
    switch (error.status) {
      case RequestErrorType.NOT_FOUND:
        console.error('User not found');
        break;
      case RequestErrorType.UNAUTHORIZED:
        console.error('Not authenticated');
        redirectToLogin();
        break;
      case RequestErrorType.FORBIDDEN:
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
async function safeRequest<T>(
  requestFn: () => Promise<RequestResponse<T>>
): Promise<T | null> {
  try {
    const res = await requestFn();
    return res.data;
  } catch (error) {
    if (error instanceof HttpError) {
      // Log to error tracking service
      trackError({
        url: error.url,
        method: error.method,
        status: error.status,
        message: error.message
      });
      
      // Show user-friendly message
      showNotification('Something went wrong. Please try again.');
    }
    return null;
  }
}

// Usage
const user = await safeRequest(() => api.get<User>('/users/1'));
```

## Framework Integration

### React Hook

```tsx
import { createHttpClient } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const api = createHttpClient({
  url: 'https://api.example.com'
});

function useUser(userId: string) {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await api.get<User>(`/users/${userId}`, {
          id: `user-${userId}`
        });
        
        if (!cancelled) {
          setData(res.data);
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

const api = createHttpClient({
  url: 'https://api.example.com'
});

export function useUser(userId: Ref<string>) {
  const data = ref<User | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  watchEffect(async () => {
    try {
      loading.value = true;
      const res = await api.get<User>(`/users/${userId.value}`);
      data.value = res.data;
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

const api = createHttpClient({
  url: 'https://api.example.com'
});

// +page.server.ts
export async function load({ params }) {
  const res = await api.get<User>(`/users/${params.id}`);
  return {
    user: res.data
  };
}
```

## Advanced Patterns

### Retry Logic

The built-in retry only works for network errors. For custom retry:

```ts
async function fetchWithRetry<T>(
  fn: () => Promise<RequestResponse<T>>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fn();
      return res.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

// Usage
const user = await fetchWithRetry(() => api.get<User>('/users/1'));
```

### Polling

```ts
function startPolling(
  url: string,
  interval: number,
  onData: (data: any) => void
) {
  const pollId = setInterval(async () => {
    try {
      const res = await api.get(url, { invalidate: true });
      onData(res.data);
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
async function batchFetch<T>(ids: string[]): Promise<T[]> {
  const requests = ids.map(id => 
    api.get<T>(`/users/${id}`, { id: `user-${id}` })
  );
  
  const responses = await Promise.all(requests);
  return responses.map(res => res.data);
}

// Usage
const users = await batchFetch<User>(['1', '2', '3']);
```
