---
title: Wayfinder — Migration
description: Migrate to the narrowed Wayfinder routing core API.
---

[[toc]]

## Wayfinder 3.0

Wayfinder 3.0 narrows the scope to routing core functionalities: route compilation, matching, history, navigation, and cancellation. Data loading remains as an optional layer. UI ownership, speculative async features, and error mutation have been removed.

### Removed features

- **`component` field** on route definitions and `RouteMatch` — UI rendering is owned by a typed view registry instead of route matching.
- **`meta` field** on route definitions and `RouteMatch` — store static UI metadata alongside the component in the view registry.
- **`lazy` field** on route definitions — store framework-specific lazy component factories in the view registry.
- **Streaming data loaders** (`AsyncGenerator` return from `data()`, `DataStream` type) — removed. Data loaders return a value or a Promise.
- **Per-match `status`** on `RouteMatch` — removed. Use the top-level `RouteState.status` instead.
- **`'streaming'` navigation status** — removed from `NavigationStatus`. Status is now `'idle' | 'loading' | 'error'`.
- **Error mutation** — the router no longer attaches symbol context to thrown objects. Error context is carried in internal wrappers; the original error identity and `cause` chain are preserved.

### Migrate `component` to adapter-layer mapping

```ts
// Before — component on route definition
const routes = {
  home: { component: HomePage, path: '/' },
  settings: { component: SettingsPage, path: '/settings' },
};
const Component = state.matches.at(-1)?.component;
```

```ts
// After — exhaustive route views with an explicit fallback
const routes = {
  home: { path: '/' },
  settings: { path: '/settings' },
} as const;
const router = createRouter({ routes, notFound: {} });
const views = router.createViewRegistry(
  { home: HomePage, settings: SettingsPage },
  { notFound: NotFoundPage },
);
const Component = views.resolve(state);
```

### Migrate `meta` to the view registry

```ts
// Before
const routes = {
  userDetail: { path: '/users/:id', meta: { section: 'users' } },
};
const section = match.meta?.section;
```

```ts
// After — keep static presentation metadata out of data loading
const router = createRouter({ routes: { userDetail: { path: '/users/:id' } } });
const views = router.createViewRegistry({
  userDetail: { component: UserPage, section: 'users' },
});
const section = views.resolve(state)?.section;
```

### Migrate `lazy` to dynamic import in data loader

```ts
// Before
const routes = {
  settings: { path: '/settings', lazy: () => import('./pages/Settings') },
};
```

```ts
// After — keep framework-specific code splitting in the view registry
const router = createRouter({ routes: { settings: { path: '/settings' } } });
const views = router.createViewRegistry({
  settings: () => import('./pages/Settings'),
});
```

### Update `preload()` targets

`preload()` remains cache-aware: its result is consumed by the next matching navigation. It now accepts the same typed named target shape as `navigate()`.

```ts
// Before
await router.preload('userDetail', { id: '42' });
```

```ts
// After
await router.preload({ name: 'userDetail', params: { id: '42' } });
```

`load()` remains the detached SSR and prerendering API; it does not warm a later client navigation.

### Scroll and view transitions remain coordinated

The `scroll` and `viewTransition` options remain on the router because both must run at the navigation commit boundary.

```ts
const router = createRouter({
  routes,
  scroll: () => 'top',
  viewTransition: true,
});

await router.navigate({ name: 'settings' }, { viewTransition: false });
```

### Migrate streaming data loaders to plain async

```ts
// Before — streaming via AsyncGenerator
data: async function* ({ signal }) {
  const items = [];
  for await (const batch of streamBatches({ signal })) {
    items.push(...batch);
    yield items;
  }
  return items;
}
```

```ts
// After — plain async function
data: async ({ signal }) => {
  const items = [];
  for await (const batch of streamBatches({ signal })) {
    items.push(...batch);
  }
  return items;
}
```

### Migrate per-match `status` to top-level status

```ts
// Before
const leafStatus = state.matches.at(-1)?.status;
```

```ts
// After — use top-level status
const status = state.status;
```

## Wayfinder 2.0

Wayfinder 2.0 removed unused exports, dead code, and internal type aliases to shrink the public surface and align with monorepo conventions.

### Replace `WayfinderError.is()` with `instanceof`

The static type guard is removed. Use `instanceof WayfinderError` to narrow unknown errors.

```ts
// Before
if (WayfinderError.is(err)) {
  // handle router error
}
```

```ts
// After
if (err instanceof WayfinderError) {
  // handle router error
}
```

### Rename Path Inspection APIs

Replace the former synchronous `resolve()` API with `match()`. It inspects the route branch without running middleware or data loaders.

```ts
// Before
const branch = router.resolve('/users/42');

// After
const branch = router.match('/users/42');
```

Replace the former asynchronous `match()` API with `load()`. It runs data loaders without changing router state or history.

```ts
// Before
const state = await router.match('/users/42');

// After
const state = await router.load('/users/42');
```

### Await Initial Navigation

Use `router.ready` when application startup must wait for the constructor-triggered navigation, including middleware, redirects, and data loaders.

```ts
const router = createRouter({ routes });
await router.ready;
mountApplication(router.getSnapshot());
```

The promise resolves after an initial blocked or unmatched navigation settles. It rejects when the initial navigation fails.

### Use Destructured Actions

Router actions are stable own properties and can be destructured directly. Remove manual `.bind(router)` wrappers.

```ts
const { isActive, navigate, url } = router;

await navigate({ name: 'settings' });
const href = url('settings');
const active = isActive('settings');
```

### Middleware Cancellation and Redirects

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

### 3.0 Upgrade Checklist

- Remove `component`, `meta`, and `lazy` from route definitions; move presentation values into `router.createViewRegistry()`.
- Give the view registry an explicit `notFound` value when the router has a `notFound` route.
- Convert positional `router.preload(name, params, query)` calls to typed target objects.
- Keep `scroll` and `viewTransition` options at the router navigation boundary.
- Convert streaming `AsyncGenerator` data loaders to plain `async` functions.
- Replace per-match `status` reads with top-level `state.status`.
- Remove `'streaming'` from `NavigationStatus` comparisons — status is now `'idle' | 'loading' | 'error'`.
