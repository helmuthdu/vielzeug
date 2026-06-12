---
title: 'Courier Examples — Mutation Variables in Callbacks'
description: 'How to access the original mutation input in onSuccess, onError, and onSettled lifecycle callbacks.'
---

## Mutation Variables in Callbacks

### Problem

After a mutation completes (or fails), you want to reference the original input — e.g., to show a contextual success toast, log the failing input, or update a related cache entry that depends on which resource was mutated.

### Solution

Every lifecycle callback (`onSuccess`, `onError`, `onSettled`) receives the `variables` that were passed to `mutate()` as its second argument.

```ts
import { createApi, createMutation, createQuery } from '@vielzeug/courier';

type Tag = { id: number; name: string };

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 30_000 });

const addTag = createMutation(
  (input: { name: string }, signal: AbortSignal) => api.post<Tag>('/tags', { body: input, signal }),
  {
    onSuccess: (tag, variables) => {
      // `variables` is `{ name: string }` — the exact input passed to mutate()
      qc.set(['tags', tag.id], tag);
      qc.invalidate(['tags']);
      console.log(`Tag "${variables.name}" created with id ${tag.id}`);
    },
    onError: (err, variables) => {
      console.error(`Failed to create tag "${variables.name}":`, err.message);
    },
    onSettled: (_data, _error, variables) => {
      // Always fires — use to hide a spinner or re-enable the form for this input
      hideSpinner(variables.name);
    },
  },
);

await addTag.mutate({ name: 'typescript' });
```

### Concurrent Mutations

When multiple `mutate()` calls run at the same time, each call's callbacks receive its own `variables` independently — even if the state visible via `getState()` reflects only the latest call.

```ts
// Both callbacks fire with their own variables
const p1 = addTag.mutate({ name: 'javascript' });
const p2 = addTag.mutate({ name: 'typescript' });

await Promise.allSettled([p1, p2]);
// onSuccess fires twice: once with { name: 'javascript' }, once with { name: 'typescript' }
```

To serialize mutations so only the latest wins, cancel the previous call before starting a new one:

```ts
addTag.cancel(); // abort any in-flight run first
await addTag.mutate({ name: 'typescript' });
```

### Pitfalls

- `onError` is **not** called when a mutation is aborted. Use `onSettled` if you need abort awareness — its `error` argument is `null` for both success and abort outcomes.
- `variables` is the value you passed to `mutate()`. It is captured at call time and does not change if the call is retried.
- Throwing inside a lifecycle callback does not reject `mutate()`. Use `onCallbackError` to observe callback errors without affecting the mutation result.

### Related

- [Mutation Cancellation](./mutation-cancel.md)
- [Optimistic Updates](./optimistic-updates.md)
- [CRUD Operations](./crud-operations.md)
