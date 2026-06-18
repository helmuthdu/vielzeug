---
title: 'Courier Examples — Authentication'
description: 'Authentication example for @vielzeug/courier.'
---

## Authentication

### Problem

Every request to your API needs a valid `Authorization` header, and when the server responds with 401 the token must be refreshed and the original request retried — without duplicating this logic at each call site.

### Solution

Use `api.headers()` to manage global tokens and `withBearerAuth()` for token-refresh flows via a shared interceptor.

```ts
import { createApi, createQuery, withBearerAuth } from '@vielzeug/courier';

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

### Using the Built-in `withBearerAuth` Preset

For token-refresh flows, use the built-in interceptor preset. It accepts a static string or an async factory:

```ts
import { withBearerAuth } from '@vielzeug/courier';

// Static token
api.use(withBearerAuth('my-static-token'));

// Dynamic token — called before every request
api.use(withBearerAuth(async () => tokenStore.getAccessToken()));
```

`withBearerAuth` correctly handles any form of `ctx.init.headers` — `undefined`, plain object, `Headers` instance, or array of tuples — so no manual spreading is required.

### Auto Token Refresh via Custom Interceptor

When you need full control over the 401 retry cycle:

```ts
const stopRefreshing = api.use(async (ctx, next) => {
  try {
    return await next(ctx);
  } catch (err) {
    if (HttpError.is(err, 401)) {
      const newToken = await refreshToken();
      api.headers({ Authorization: `Bearer ${newToken}` });
      // Replay the original request with the updated header
      return next(ctx.withHeaders({ Authorization: `Bearer ${newToken}` }));
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

- [Request Middleware Logging (Rune)](@vielzeug/rune/examples/request-middleware)
- [RBAC Guards (Ward)](/ward/)

- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
- [Error Handling Patterns](./error-handling-patterns.md)
