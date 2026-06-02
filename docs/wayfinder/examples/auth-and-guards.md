---
title: 'Wayfinder Examples — Auth and Guards'
description: 'Auth and guards example for @vielzeug/wayfinder.'
---

## Auth and Guards

### Problem

Auth checks duplicated across data loaders create inconsistent enforcement. Unauthenticated users reaching protected routes receive partial or invalid state.

### Solution

Use middleware on protected routes. Redirect before `next()` is called to cancel the navigation entirely.

```ts
import { createRouter } from '@vielzeug/wayfinder';

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
      component: LoginPage,
    },
    dashboard: {
      path: '/dashboard',
      middleware: [requireAuth],
      component: DashboardPage,
    },
  },
  notFound: { component: NotFoundPage },
});
```

#### With `redirectTo()` helper

For simple unconditional redirects, use the `redirectTo()` helper instead of a manual middleware function.

```ts
import { createRouter, redirectTo } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    login: { path: '/login', component: LoginPage },
    admin: {
      path: '/admin',
      middleware: [redirectTo({ name: 'login' }, { replace: true })],
      component: AdminPage,
    },
  },
});
```

### Pitfalls

- Middleware that neither calls `next()` nor redirects cancels the navigation silently — the router stays on the current URL and status returns to `'idle'`. This is intentional for blocking middleware.
- Per-route middleware runs after global middleware, so any auth state populated by a global middleware loader is already available in `ctx.locals`.
- `redirectTo()` is unconditional. For conditional guards (e.g., checking a role), write a custom middleware function.

### Related

- [Wayfinder Route Table Basics](./route-table-basics.md)
- [Not Found and Error Boundary](./not-found-and-error-boundary.md)
- [RBAC with Ward](/ward/)
