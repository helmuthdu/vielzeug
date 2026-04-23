---
title: 'Fetchit Examples — Mutation Cancellation'
description: 'Mutation cancellation examples for fetchit.'
---

## Mutation Cancellation

## Problem

Implement mutation cancellation in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery();

const uploadFile = createMutation(
  ({ input, signal }: { input: File; signal?: AbortSignal }) =>
    api.post<UploadResult>('/upload', {
      body: (() => {
        const f = new FormData();
        f.append('file', input);
        return f;
      })(),
      signal,
    }),
);

// Cancellation is caller-owned
const ac = new AbortController();

try {
  const result = await uploadFile.mutate(selectedFile, { signal: ac.signal });
  qc.invalidate(['files']);
} catch (error) {
  if (!(error instanceof DOMException && error.name === 'AbortError')) {
    throw error;
  }
}

ac.abort();
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
