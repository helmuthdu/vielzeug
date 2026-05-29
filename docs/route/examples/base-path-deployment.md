---
title: 'Route Examples — Base Path Deployment'
description: Deploy a Route SPA under a subdirectory using the base option.
---

## Base Path Deployment

Set `base` once and keep route definitions base-agnostic.

```ts
import { createRouter } from '@vielzeug/route';

const router = createRouter({
  base: '/my-app',
  routes: {
    home: { path: '/', handler: () => renderHome() },
    about: { path: '/about', handler: () => renderAbout() },
    userDetail: { path: '/users/:id', handler: ({ params }) => renderUser(params.id) },
    notFound: { path: '*', handler: () => renderNotFound() },
  },
});

await router.navigate({ name: 'about' }); // pushes /my-app/about
const href = router.url('userDetail', { id: '7' }); // /my-app/users/7
const match = router.resolve('/my-app/users/7');
// [
//   { component: undefined, name: 'userDetail', params: { id: '7' }, pathname: '/users/7', data: undefined, meta: undefined },
// ]
```

Remember to configure server rewrites so deep links under `/my-app/*` return your SPA entry file.
