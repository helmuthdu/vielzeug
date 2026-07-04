---
title: 'Courier Examples — Mutation Cancellation'
description: 'Mutation Cancel example for @vielzeug/courier.'
---

## Mutation Cancellation

### Problem

The user triggers a long-running mutation (e.g., a bulk operation) and then wants to cancel it. You need to abort the in-flight request cleanly and reset the UI to its pre-submit state.

### Solution

Use `mutation.cancel()` to abort the active run and reset state, or pass an external `AbortSignal` via `mutate(vars, { signal })` for caller-controlled cancellation.

```ts
import { CourierAbortError, createApi, createMutation, createQuery } from '@vielzeug/courier';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery();

const uploadFile = createMutation((input: File, signal: AbortSignal) =>
  api.post<UploadResult>('/upload', {
    body: (() => {
      const f = new FormData();
      f.append('file', input);
      return f;
    })(),
    signal,
  }),
);

const ac = new AbortController();
const pending = uploadFile.mutate(selectedFile, { signal: ac.signal });

try {
  const result = await pending;
  qc.invalidate(['files']);
} catch (error) {
  // api.post() (the mutation fn here) normalizes cancellation into CourierAbortError —
  // no need to check the native DOMException name.
  if (!(error instanceof CourierAbortError)) {
    throw error;
  }
}

uploadFile.cancel(); // internal cancellation
ac.abort();
```

### Pitfalls

- Aborting a mutation does not roll back any optimistic state you already applied. Restore the previous value in the abort handler explicitly.
- `AbortController.abort()` is idempotent — calling it multiple times on the same controller after the first abort is a no-op. Create a fresh controller for each new mutation attempt.
- Cancelled mutations may still receive a server response if the request reached the server before the abort. Handle the `CourierAbortError` case and ignore any late-arriving responses.

### Related

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
