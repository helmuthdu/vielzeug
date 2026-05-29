---
title: 'Route Examples — Auth and Guards'
description: Protect routes using global and route middleware.
---

## Auth and Guards

Implement auth checks in middleware and redirect unauthenticated users.

```ts
import { createRouter } from '@vielzeug/route';

const requireAuth = async (ctx, next) => {
  if (!session.currentUser) {
    await ctx.navigate({ name: 'login' }, { replace: true });
    return;
  }

  ctx.locals.user = session.currentUser;
  await next();
};

const router = createRouter({
  routes: {
    login: {
      path: '/login',
      handler: () => renderLogin(),
    },
    dashboard: {
      path: '/dashboard',
      middleware: [requireAuth],
      handler: (ctx) => renderDashboard(ctx.locals.user),
    },
    notFound: {
      path: '*',
      handler: () => renderNotFound(),
    },
  },
});
```

This keeps access rules near the route while preserving a clear handler pipeline.

### Related

- [Route Table Basics](./route-table-basics.md)
- [RBAC with Permit](/permit/)
- [Shared Store (Ripple)](@vielzeug/ripple/examples/pattern-shared-module-store)
