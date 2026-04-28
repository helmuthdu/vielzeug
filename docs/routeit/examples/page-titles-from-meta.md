---
title: 'Routeit Examples — Page Titles from Meta'
description: Drive document.title from route metadata and state subscriptions.
---

## Page Titles from Meta

Store title hints in route `meta`, then apply them in a single subscription.

```ts
import { createRouter } from '@vielzeug/routeit';

type Meta = { title?: string };

const router = createRouter({
  routes: {
    home: {
      path: '/',
      meta: { title: 'Home' } satisfies Meta,
      handler: () => renderHome(),
    },
    users: {
      path: '/users',
      meta: { title: 'Users' } satisfies Meta,
      handler: () => renderUsers(),
    },
    userDetail: {
      path: '/users/:id',
      meta: { title: 'User Detail' } satisfies Meta,
      handler: ({ params }) => renderUser(params.id),
    },
    notFound: {
      path: '*',
      meta: { title: 'Not Found' } satisfies Meta,
      handler: () => renderNotFound(),
    },
  },
});

router.subscribe((state) => {
  const m = state.matches.at(-1)?.meta as Meta | undefined;
  document.title = m?.title ? `${m.title} - My App` : 'My App';
});
```

This pattern keeps page title logic centralized and deterministic. For nested routes, read `router.state.matches` and use the leaf route (or combine branch metadata for breadcrumb-style titles).
