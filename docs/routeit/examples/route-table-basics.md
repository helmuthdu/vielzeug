---
title: 'Routeit Examples — Route Table Basics'
description: Define routes declaratively and navigate by route name.
---

## Route Table Basics

Build the router from one declarative table and use route names everywhere else.

```ts
import { createRouter, defineRoutes } from '@vielzeug/routeit';

const routes = defineRoutes({
  home: {
    path: '/',
    handler: () => renderHome(),
  },
  users: {
    path: '/users',
    handler: () => renderUsers(),
  },
  userDetail: {
    path: '/users/:id',
    handler: ({ params }) => renderUser(params.id),
    meta: { title: 'User' },
  },
  notFound: {
    path: '*',
    handler: () => renderNotFound(),
  },
});

const router = createRouter({ routes });
router.start();

await router.navigate({ name: 'userDetail', params: { id: '42' } });
const href = router.url('userDetail', { id: '42' }, { tab: 'profile' });
```

Use object key order to control precedence for ambiguous routes.
