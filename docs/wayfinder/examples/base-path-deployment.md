---
title: 'Wayfinder Examples — Base Path Deployment'
description: 'Base path deployment example for @vielzeug/wayfinder.'
---

## Base Path Deployment

### Problem

Hosting an SPA under a subdirectory (e.g., `/my-app`) requires every `pushState` call and route definition to carry the prefix, coupling deployment details into application code.

### Solution

Set `base` once at router creation. All route definitions, `url()`, `navigate()`, and `resolve()` are then base-agnostic.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  base: '/my-app',
  routes: {
    home: { path: '/' },
    about: { path: '/about' },
    userDetail: { path: '/users/:id', data: async ({ params }) => fetchUser(params.id) },
  },
  notFound: { component: NotFoundPage },
});

await router.navigate({ name: 'about' });           // pushes /my-app/about
const href = router.url('userDetail', { id: '7' }); // '/my-app/users/7'
const branch = router.resolve('/my-app/users/7');   // strips base: params.id = '7'
```

### Pitfalls

- The server must rewrite all requests under `/my-app/*` to serve the SPA entry file. Without this, direct link access to `/my-app/about` returns 404.
- When using `resolve()`, always pass the full URL including the base prefix. Wayfinder strips the base internally.
- Do not set `base` in development if `vite.config.ts` already sets `base: '/my-app'`; double-prefixing breaks all navigation.

### Related

- [Route Table Basics](./route-table-basics.md)
- [Raw Path Targets](./raw-path-targets.md)
