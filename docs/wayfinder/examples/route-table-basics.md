---
title: 'Wayfinder Examples — Route Table Basics'
description: 'Route table basics example for @vielzeug/wayfinder.'
---

## Route Table Basics

### Problem

Routing logic scattered across event handlers leads to duplicated path strings and no single place to add cross-cutting concerns like middleware or data loading.

### Solution

Define all routes in one declarative table passed to `createRouter()`. Named routes eliminate duplicated path strings everywhere else in the app.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const routes = {
  home: {
    path: '/',
    handler: () => renderHome(),
  },
  dashboard: {
    path: '/dashboard',
    children: {
      index: {
        index: true,
        handler: () => renderDashboardHome(),
      },
      settings: {
        path: 'settings',
        data: async () => fetchSettings(),
        handler: ({ data }) => renderSettings(data),
      },
    },
  },
  userDetail: {
    path: '/users/:id',
    data: async ({ params }) => fetchUser(params.id),
    handler: ({ data }) => renderUser(data),
    meta: { title: 'User' },
  },
  notFound: {
    path: '*',
    handler: () => renderNotFound(),
  },
};

const router = createRouter({ routes });

await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'dashboard.settings' });
const href = router.url('userDetail', { id: '42' }, { tab: 'profile' });
```

### Pitfalls

- Object key order controls match precedence. Place `notFound: { path: '*' }` last, or it will match every route.
- Child route `path` values are relative to the parent. Omit the leading slash: `path: 'settings'`, not `path: '/settings'`.
- A route key that contains a dot (e.g., `'user.detail'`) will clash with nested compound names. Avoid dots in top-level keys.

### Related

- [Auth and Guards](./auth-and-guards.md)
- [Not Found and Error Boundary](./not-found-and-error-boundary.md)
- [Ripple — reactive state](/ripple/)
