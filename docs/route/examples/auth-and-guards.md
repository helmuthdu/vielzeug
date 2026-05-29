---
title: 'Route Examples — Auth and Guards'
description: 'Auth and guards example for @vielzeug/route.'
---

## Auth and Guards

### Problem

Auth checks duplicated across handlers create inconsistent enforcement. Unauthenticated users reaching protected handlers receive partial or invalid state.

### Solution

Use middleware on protected routes. Redirect before `next()` is called to cancel the navigation entirely.

```ts
import { createRouter } from '@vielzeug/route';

const requireAuth = async (ctx, next) => {
  if (!session.currentUser) {
    // Replace the history entry so back-button doesn't loop back to /dashboard.
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

#### With `redirectTo()` helper

For simple unconditional redirects, use the `redirectTo()` helper instead of a manual middleware function.

```ts
import { createRouter, redirectTo } from '@vielzeug/route';

const router = createRouter({
  routes: {
    login: { path: '/login', handler: () => renderLogin() },
    admin: {
      path: '/admin',
      middleware: [redirectTo({ name: 'login' }, { replace: true })],
      handler: () => renderAdmin(),
    },
  },
});
```

### Pitfalls

- Middleware must either call `await next()` or redirect. Returning without doing either leaves the navigation in a loading state indefinitely.
- Per-route middleware runs after global middleware, so any auth state populated by a global middleware loader is already available in `ctx.locals`.
- `redirectTo()` is unconditional. For conditional guards (e.g., checking a role), write a custom middleware function.

### Related

- [Route Table Basics](./route-table-basics.md)
- [Not Found and Error Boundary](./not-found-and-error-boundary.md)
- [RBAC with Permit](/permit/)
