---
title: 'Wayfinder Examples — Page Titles from View Metadata'
description: 'Typed page-title metadata example for @vielzeug/wayfinder.'
---

## Page Titles from View Metadata

### Problem

Setting `document.title` inside individual loaders is repetitive, couples static presentation to data fetching, and misses browser-driven navigation.

### Solution

Store titles in the typed view registry and update the document from one subscription.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    home: { path: '/' },
    users: { path: '/users' },
    userDetail: {
      path: '/users/:id',
      data: async ({ params }) => fetchUser(params.id),
    },
  },
  notFound: {},
});

const views = router.createViewRegistry(
  {
    home: { component: HomePage, title: 'Home' },
    users: { component: UsersPage, title: 'Users' },
    userDetail: { component: UserPage, title: 'User detail' },
  },
  { notFound: { component: NotFoundPage, title: 'Not found' } },
);

const applyTitle = (state: ReturnType<typeof router.getSnapshot>) => {
  const view = views.resolve(state);
  document.title = view ? `${view.title} — My App` : 'My App';
};

await router.ready;
applyTitle(router.getSnapshot());
router.subscribe(applyTitle);
```

### Pitfalls

- `router.subscribe()` does not synchronously emit the current snapshot. Await `router.ready`, apply it once, then subscribe.
- Registry keys are exhaustive. Add title metadata when adding a route rather than falling back silently.

### Related

- [Route Table Basics](./route-table-basics.md)
- [Not Found and Error Boundary](./not-found-and-error-boundary.md)
