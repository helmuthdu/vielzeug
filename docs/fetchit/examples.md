# Fetchit Examples

Practical examples showing common use cases and patterns with the new separate client architecture.

::: tip 💡 Complete Applications
These are complete application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Framework Integration

::: details 🎯 Why Two Patterns?
We provide both **inline** and **hook/composable** patterns because:

- **Inline**: Quick prototyping, one-off integrations
- **Hook/Composable**: Reusable across components, better separation of concerns

Choose based on your project structure and team preferences.
:::

Complete examples showing how to integrate Fetchit with React, Vue, Svelte, and Web Components.

### Basic Integration (Inline)

Directly create and use a client within components.

::: code-group

```tsx [React]
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';
import { useEffect, useState } from 'react';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

function UserProfile({ userId }: { userId: string }) {
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

  if (state.isLoading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error.message}</div>;
  if (!state.data) return <div>User not found</div>;

  return <div>{state.data.name}</div>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ userId: string }>();
const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

const state = ref({
  data: null as User | null,
  isLoading: true,
  error: null as Error | null,
});

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = queryClient.subscribe(['users', props.userId], (newState) => {
    state.value = {
      data: newState.data ?? null,
      isLoading: newState.isLoading,
      error: newState.error,
    };
  });

  queryClient
    .fetch({
      queryKey: ['users', props.userId],
      queryFn: () => http.get<User>(`/users/${props.userId}`),
      staleTime: 5000,
    })
    .catch(() => {});
});

onUnmounted(() => unsubscribe?.());
</script>

<template>
  <div v-if="state.isLoading">Loading...</div>
  <div v-else-if="state.error">Error: {{ state.error.message }}</div>
  <div v-else-if="!state.data">User not found</div>
  <div v-else>{{ state.data.name }}</div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';
  import { onDestroy } from 'svelte';

  export let userId: string;

  const http = createHttpClient({ baseUrl: 'https://api.example.com' });
  const queryClient = createQueryClient();

  let state = {
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  };

  const unsubscribe = queryClient.subscribe(['users', userId], (newState) => {
    state = {
      data: newState.data ?? null,
      isLoading: newState.isLoading,
      error: newState.error,
    };
  });

  queryClient
    .fetch({
      queryKey: ['users', userId],
      queryFn: () => http.get<User>(`/users/${userId}`),
      staleTime: 5000,
    })
    .catch(() => {});

  onDestroy(unsubscribe);
</script>

{#if state.isLoading}
  <div>Loading...</div>
{:else if state.error}
  <div>Error: {state.error.message}</div>
{:else if !state.data}
  <div>User not found</div>
{:else}
  <div>{state.data.name}</div>
{/if}
```

```ts [Web Component]
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

class UserCard extends HTMLElement {
  #http = createHttpClient({ baseUrl: 'https://api.example.com' });
  #queryClient = createQueryClient();
  #unsubscribe: (() => void) | null = null;

  connectedCallback() {
    const userId = this.getAttribute('user-id') ?? '';
    if (!userId) return;

    this.#unsubscribe = this.#queryClient.subscribe(['users', userId], (state) => {
      this.render(state);
    });

    this.#queryClient
      .fetch({
        queryKey: ['users', userId],
        queryFn: () => this.#http.get<User>(`/users/${userId}`),
        staleTime: 5000,
      })
      .catch(() => {});
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
  }

  render(state: any) {
    this.innerHTML = state.isLoading
      ? '<div>Loading...</div>'
      : state.error
        ? `<div>Error: ${state.error.message}</div>`
        : state.data
          ? `<div>${state.data.name}</div>`
          : '<div>User not found</div>';
  }
}

customElements.define('user-card', UserCard);
```

:::

### Advanced Integration (Hook/Composable)

Recommended pattern for reusability and separation of concerns.

::: code-group

```tsx [React]
// useUser.ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';
import { useEffect, useMemo, useState } from 'react';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

export function useUser(userId: string) {
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

// UserProfile.tsx
function UserProfile({ userId }: { userId: string }) {
  const state = useUser(userId);

  if (state.isLoading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error.message}</div>;
  if (!state.data) return <div>User not found</div>;

  return <div>{state.data.name}</div>;
}
```

```vue [Vue 3]
// useUser.ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';
import { ref, onMounted, onUnmounted } from 'vue';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

export function useUser(userId: () => string) {
  const state = ref({
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  });

  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    const id = userId();
    if (!id) return;

    unsubscribe = queryClient.subscribe(['users', id], (newState) => {
      state.value = {
        data: newState.data ?? null,
        isLoading: newState.isLoading,
        error: newState.error,
      };
    });

    queryClient
      .fetch({
        queryKey: ['users', id],
        queryFn: () => http.get<User>(`/users/${id}`),
        staleTime: 5000,
      })
      .catch(() => {});
  });

  onUnmounted(() => unsubscribe?.());

  return state;
}

// UserProfile.vue
<script setup lang="ts">
const props = defineProps<{ userId: string }>();
const state = useUser(() => props.userId);
</script>

<template>
  <div v-if="state.isLoading">Loading...</div>
  <div v-else-if="state.error">Error: {{ state.error.message }}</div>
  <div v-else-if="!state.data">User not found</div>
  <div v-else>{{ state.data.name }}</div>
</template>
```

```svelte [Svelte]
// userStore.ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';
import { writable } from 'svelte/store';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });
const queryClient = createQueryClient();

export function useUser(userId: string) {
  const state = writable({
    data: null as User | null,
    isLoading: true,
    error: null as Error | null,
  });

  const unsubscribe = queryClient.subscribe(['users', userId], (newState) => {
    state.set({
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

  return { subscribe: state.subscribe, unsubscribe };
}

// +page.svelte
<script lang="ts">
  import { useUser } from './userStore';

  export let data: { id: string };

  const userStore = useUser(data.id);
</script>

{#if $userStore.isLoading}
  <div>Loading...</div>
{:else if $userStore.error}
  <div>Error: {$userStore.error.message}</div>
{:else if !$userStore.data}
  <div>User not found</div>
{:else}
  <div>{$userStore.data.name}</div>
{/if}
```

```ts [Web Component]
// BaseUserElement.ts
import { createHttpClient, createQueryClient } from '@vielzeug/fetchit';

export class BaseUserElement extends HTMLElement {
  http = createHttpClient({ baseUrl: 'https://api.example.com' });
  queryClient = createQueryClient();

  async fetchUser(userId: string) {
    return this.queryClient.fetch({
      queryKey: ['users', userId],
      queryFn: () => this.http.get<User>(`/users/${userId}`),
      staleTime: 5000,
    });
  }

  subscribeToUser(userId: string, listener: (state: any) => void) {
    return this.queryClient.subscribe(['users', userId], listener);
  }
}
```

:::

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

::: warning 🔐 Security Best Practices

- Never store tokens in localStorage (use httpOnly cookies when possible)
- Implement token refresh logic
- Clear cache on logout to prevent data leaks
- Always validate tokens on the server-side
  :::

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
  queryClient.clear(); // Clear cached authenticated data
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
// Clear all cached queries
queryClient.clear();
```

// Invalidate all user queries (pattern matching)
queryClient.invalidate(['users']);

// Check cache size
console.log(`Cache contains ${size} entries`);

````

## URL Building

### Query Parameters

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Use query option for query string parameters
const users = await http.get<User[]>('/api/users', {
  query: {
    page: 1,
    limit: 10,
    sort: 'name',
    active: true,
  },
});
// Actual request: "/api/users?page=1&limit=10&sort=name&active=true"
````

### Dynamic URLs

```ts
const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// Using path parameters
function getUser(id: string) {
  return http.get<User>('/users/:id', {
    params: { id },
  });
}

// Using query parameters for search
function searchUsers(query: string, page: number) {
  return http.get<User[]>('/users/search', {
    query: { q: query, page },
  });
}

// Combining both
function getUserPosts(userId: string, status: string, limit: number) {
  return http.get<Post[]>('/users/:userId/posts', {
    params: { userId },
    query: { status, limit },
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
  { name: 'Alice' },
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
