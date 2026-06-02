---
title: 'Courier Examples — Query Subscriptions'
description: 'Query Callbacks example for @vielzeug/courier.'
---

## Query Subscriptions

### Problem

You want to react to every state transition of a query — data arriving, loading starting, an error being thrown — from a single subscription point rather than checking state in a render loop.

### Solution

Subscriptions give one stable mental model for UI state: subscribe once, render from `QueryState`, and trigger reads imperatively.

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

const stop = qc.subscribe<User>(['users', userId], (state) => {
  if (state.isFetching) renderSpinner();
  if (state.status === 'error') toast.error(state.error!.message);
  if (state.status === 'success') renderUser(state.data!);
});

await qc.fetch({
  key: ['users', userId],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
});

stop();

// Retry policy can be set per query call
const retryingQc = createQuery();

await retryingQc.fetch({
  key: ['config'],
  fn: ({ signal }) => api.get('/config', { signal }),
  times: 3,
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500,
});
```


### Pitfalls

- The subscription callback fires on every successful response, including background revalidations. Avoid one-time side effects (analytics events, success toasts) inside it without a `hasNotified` guard.
- Subscribing in a render cycle without returning an unsubscribe function leaks the listener. Always clean up in `useEffect`'s return function or `onUnmounted`.
- The callback is not debounced. Rapid successive state changes (e.g., polling + manual refresh) fire the callback for each — guard with a ref if only the latest value matters.

### Related

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
