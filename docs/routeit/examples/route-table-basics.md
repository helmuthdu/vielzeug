---
title: 'Routeit Examples — Route Table Basics'
description: Define routes declaratively and navigate by route name.
---

## Route Table Basics

Build the router from one declarative table and use route names everywhere else. Nested routes and `data()` stay inside that same table.

```ts
import { createRouter } from '@vielzeug/routeit';

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

Use object key order to control precedence for ambiguous routes. Nested children get compound names like `dashboard.settings`.

### Related

- [Auth and Guards](./auth-and-guards.md)
- [Page State (Stateit)](/stateit/examples/pattern-shared-module-store)
- [Not Found and Error Boundary](./not-found-and-error-boundary.md)
