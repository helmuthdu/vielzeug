---
title: 'Fetchit Examples — Authentication'
description: 'Authentication examples for fetchit.'
---

## Authentication

### Problem

Every request to your API needs a valid `Authorization` header, and when the server responds with 401 the token must be refreshed and the original request retried — without duplicating this logic at each call site.

### Solution

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery();

function login(token: string) {
  api.headers({ Authorization: `Bearer ${token}` });
}

function logout() {
  api.headers({ Authorization: undefined }); // remove header
  qc.clear(); // clear cached authenticated data
}
```

### Auto Token Refresh via Interceptor

```ts
const stopRefreshing = api.use(async (ctx, next) => {
  try {
    return await next(ctx);
  } catch (err) {
    if (HttpError.is(err, 401)) {
      const newToken = await refreshToken();
      api.headers({ Authorization: `Bearer ${newToken}` });
      // Retry with updated header
      ctx.init.headers = { ...(ctx.init.headers as object), Authorization: `Bearer ${newToken}` };
      return next(ctx);
    }
    throw err;
  }
});
```


### Pitfalls

- Storing the auth token in a module-level variable leaks across requests in SSR environments. Use request-scoped storage (e.g., `AsyncLocalStorage`) in server contexts.
- A token refresh race condition occurs when two concurrent 401s both start a refresh. Guard with a shared in-flight promise: the first refresh stores it; subsequent calls await the same promise.
- After a successful refresh, the interceptor must replay the original failed request with the new token — not just update the global header for future requests.

### Related
- [Request Middleware Logging (Logit)](/logit/examples/request-middleware)
- [RBAC Guards (Permit)](/permit/)

- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
- [Error Handling Patterns](./error-handling-patterns.md)
