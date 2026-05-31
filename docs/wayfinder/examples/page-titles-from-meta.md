---
title: 'Wayfinder Examples — Page Titles from Meta'
description: 'Page titles from meta example for @vielzeug/wayfinder.'
---

## Page Titles from Meta

### Problem

Setting `document.title` inside individual handlers is repetitive and misses back/forward navigation driven by the browser's own history buttons.

### Solution

Store title hints in route `meta` and update `document.title` in a single `subscribe()` callback.

```ts
import { createRouter } from '@vielzeug/wayfinder';

type Meta = { title?: string };

const router = createRouter({
  routes: {
    home: {
      path: '/',
      meta: { title: 'Home' } satisfies Meta,
    },
    users: {
      path: '/users',
      meta: { title: 'Users' } satisfies Meta,
    },
    userDetail: {
      path: '/users/:id',
      meta: { title: 'User Detail' } satisfies Meta,
      data: async ({ params }) => fetchUser(params.id),
    },
  },
  notFound: {
    meta: { title: 'Not Found' } satisfies Meta,
    component: NotFoundPage,
  },
});

// Set title on initial load from current snapshot, then update on every navigation.
const applyTitle = (state: ReturnType<typeof router.getSnapshot>) => {
  const m = state.matches.at(-1)?.meta as Meta | undefined;
  document.title = m?.title ? `${m.title} — My App` : 'My App';
};

applyTitle(router.getSnapshot());
router.subscribe(applyTitle);
```

### Pitfalls

- `router.subscribe()` does not fire for the initial navigation. Call `applyTitle(router.getSnapshot())` before subscribing, or the title will be blank until the first user-triggered navigation.
- For nested routes, use all entries in `state.matches` (not just the leaf) to build breadcrumb-style titles from root to leaf.

### Related

- [Route Table Basics](./route-table-basics.md)
- [Not Found and Error Boundary](./not-found-and-error-boundary.md)
