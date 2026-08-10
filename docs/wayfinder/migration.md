---
title: Wayfinder — Migration
description: Migrate to the breaking Wayfinder navigation and path-inspection APIs.
---

[[toc]]

## Rename Path Inspection APIs

Replace the former synchronous `resolve()` API with `matchPath()`. It inspects the route branch without running middleware or data loaders.

```ts
// Before
const branch = router.resolve('/users/42');

// After
const branch = router.matchPath('/users/42');
```

Replace the former asynchronous `match()` API with `loadPath()`. It resolves lazy modules and runs data loaders without changing router state or history.

```ts
// Before
const state = await router.match('/users/42');

// After
const state = await router.loadPath('/users/42');
```

`resolve()` and `match()` have been removed. Update every call site; there are no compatibility aliases.

## Await Initial Navigation

Use `router.ready` when application startup must wait for the constructor-triggered navigation, including middleware, redirects, lazy modules, and data loaders.

```ts
const router = createRouter({ routes });
await router.ready;
mountApplication(router.getSnapshot());
```

The promise resolves after an initial blocked or unmatched navigation settles. It rejects when the initial navigation fails.

## Use Destructured Actions

Router actions are stable own properties and can be destructured directly. Remove manual `.bind(router)` wrappers.

```ts
const { isActive, navigate, url } = router;

await navigate({ name: 'settings' });
const href = url('settings');
const active = isActive('settings');
```

## Middleware Cancellation and Redirects

Programmatic navigation now waits to write history until middleware reaches the terminal stage. Middleware that returns without `next()` cancels the navigation without changing the URL or route snapshot.

Redirect middleware continues to work. Call and await `ctx.navigate()` without calling `next()` to cancel the original navigation and start the redirect navigation.

```ts
const requireAuth = async (ctx, next) => {
  if (!session.currentUser) {
    await ctx.navigate({ name: 'login' }, { replace: true });
    return;
  }

  await next();
};
```
