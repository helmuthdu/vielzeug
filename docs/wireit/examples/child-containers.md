---
title: 'Wireit Examples — Child Containers'
description: 'Child Containers examples for wireit.'
---

## Child Containers

## Problem

Implement child containers in a production-friendly way with `@vielzeug/wireit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/wireit` installed.

### Per-request scoping

```ts
const RequestToken = createToken<Request>('Request');
const UserToken = createToken<User>('User');
const HandlerToken = createToken<RequestHandler>('RequestHandler');

// Root — shared across all requests
container.bind(HandlerToken, RequestHandler, { deps: [DbToken, UserToken] });

// Express middleware
app.use(async (req, _res, next) => {
  const scope = container.createChild();

  try {
    scope.value(RequestToken, req);
    scope.value(UserToken, await authenticateRequest(req));

    const handler = await scope.resolve(HandlerToken);
    await handler.handle(req);
  } finally {
    await scope.dispose();
  }

  next();
});
```

### Tenant isolation

```ts
async function handleTenantRequest(tenantId: string, action: () => Promise<void>) {
  const scope = container.createChild();

  try {
    const tenantConfig = await loadTenantConfig(tenantId);
    scope.value(TenantConfigToken, tenantConfig);
    scope.factory(DbToken, (cfg) => new Database(cfg.connectionString), {
      deps: [TenantConfigToken],
    });
    await action();
  } finally {
    await scope.dispose();
  }
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Lifetimes](./lifetimes.md)
- [Async Providers](./async-providers.md)
- [Basic Setup](./basic-setup.md)
