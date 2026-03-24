---
title: 'Fetchit Examples — Authentication'
description: 'Authentication examples for fetchit.'
---

## Authentication

## Problem

Implement authentication in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

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
const dispose = api.use(async (ctx, next) => {
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

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
- [Error Handling Patterns](./error-handling-patterns.md)
