---
title: 'Courier Examples — Disposal'
description: 'Disposal examples for courier.'
---

## Disposal

### Problem

A component starts an HTTP request and is unmounted before the response arrives. Continuing to update state on a destroyed component produces warnings or errors — you need to cancel in-flight requests on teardown.

### Solution

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery();

// Manual disposal — good for singleton cleanup on logout
function cleanup() {
  api.dispose();
  qc.dispose();
}
```


### Pitfalls

- Aborting via `AbortController` cancels the network request but does not prevent state updates that were queued before the abort. Guard setters with a mounted/active flag.
- Calling `client.dispose()` cancels all in-flight requests and rejects new ones. Dispose only a component-scoped client — never a shared singleton.
- `AbortError` does not subclass `Error` in all environments. Check `err.name === 'AbortError'` rather than `err instanceof AbortError` for reliable detection.

### Related

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Error Handling Patterns](./error-handling-patterns.md)
