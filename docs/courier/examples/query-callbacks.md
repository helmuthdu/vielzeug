---
title: 'Courier Examples — Query Subscriptions'
description: 'Query Callbacks example for @vielzeug/courier.'
---

## Query Subscriptions

### Problem

You want to react to every state transition of a query — data arriving, loading starting, an error being thrown — from a single subscription point rather than checking state in a render loop.

### Solution

Use `observe()` to get a store that triggers a background fetch and emits state updates. Subscribe to the store, then read the latest snapshot with `peek()` on each notification.

```ts
import { createApi, createQuery } from '@vielzeug/courier';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

const store = qc.observe<User>({
  key: ['users', userId],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
});

const stop = store.subscribe(() => {
  const state = store.peek();
  if (state.isFetching) renderSpinner();
  if (state.status === 'error') toast.error(state.error.message);
  if (state.status === 'success') renderUser(state.data);
});

// Read the initial state synchronously before the first notification
const initial = store.peek();

stop();

// Retry policy can be set per query call
await qc.fetch({
  key: ['config'],
  fn: ({ signal }) => api.get('/config', { signal }),
  times: 3,
  shouldRetry: (err) => !CourierHttpError.is(err) || (err.status ?? 500) >= 500,
});
```

For a pure read-through store without triggering a fetch, use `watchKey()`:

```ts
const store = qc.watchKey<User>(['users', userId]);
const stop = store.subscribe(() => console.log(store.peek()));
stop();
```

### Pitfalls

- The subscription callback fires on every state transition, including background revalidations. Avoid one-time side effects (analytics events, success toasts) inside it without a `hasNotified` guard.
- Subscribing in a render cycle without returning an unsubscribe function leaks the listener. Always clean up in `useEffect`'s return function or `onUnmounted`.
- The callback is not debounced. Rapid successive state changes (e.g., polling + manual refresh) fire the callback for each — guard with a ref if only the latest value matters.

### Related

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
