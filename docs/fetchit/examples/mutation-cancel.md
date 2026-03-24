---
title: 'Fetchit Examples — Mutation Cancel'
description: 'Mutation Cancel examples for fetchit.'
---

## Mutation Cancel

## Problem

Implement mutation cancel in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery();

const uploadFile = createMutation(
  (file: File) =>
    api.post<UploadResult>('/upload', {
      body: (() => {
        const f = new FormData();
        f.append('file', file);
        return f;
      })(),
    }),
  { onSuccess: () => qc.invalidate(['files']) },
);

// In a component — cancel on unmount to avoid state updates after destruction
uploadFile.mutate(selectedFile);
// ...on unmount:
uploadFile.cancel();

// Or drive cancellation via external signal
const ac = new AbortController();
uploadFile.mutate(selectedFile, { signal: ac.signal });
ac.abort(); // same effect
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
