---
title: Wayfinder — Usage Guide
description: Router setup, middleware, data loading, nested routes, and state patterns for Wayfinder.
---

[[toc]]

::: tip New to Wayfinder?
Start with the [Overview](./index.md), then use this page for the day-to-day API.
:::

## Basic Usage

Create a deterministic router with memory history, wait for startup, and navigate by route name.

```ts
import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home: { path: '/' },
    settings: {
      data: async () => ({ section: 'settings' }),
      path: '/settings',
    },
  },
});

await router.ready;
await router.navigate({ name: 'settings' });
console.log(router.getSnapshot().matches.at(-1)?.data);
router.dispose();
```

`routes` is required. Route keys become names, and object key order controls match precedence.

## Define Routes

Each route can provide these fields:

| Field          | Purpose                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `path`         | Match pattern                                                                                                               |
| `children`     | Nested child routes                                                                                                         |
| `index`        | Default child route that inherits the parent path                                                                           |
| `data`         | Abortable route data function. Result available as `match.data`.                                                            |
| `middleware`   | Route-specific middleware                                                                                                   |
| `onError`      | Per-route error boundary. Called when this route's `data()` throws; its return value becomes `match.data`.                  |
| `redirect`     | Declarative permanent redirect. Resolved before middleware runs.                                                            |
| `coerceSearch` | Coerce raw URL search strings into typed values. Return value replaces `ctx.query`. Throw to leave the raw query unchanged. |

Use wildcard routes for fallback behavior:

```ts
const routes = {
  docs: { path: '/docs/*' },
};
```

For a catch-all not-found page, use the `notFound` option in router options instead of a `path: '*'` route:

```ts
const router = createRouter({
  routes,
  notFound: {
    data: async ({ pathname }) => ({ requestedPath: pathname }),
  },
});
```

Alternatively, `path: '*'` still works as a named route when you need to navigate to it explicitly.

Nested routes compose naturally and create compound route names:

```ts
const routes = {
  dashboard: {
    path: '/dashboard',
    children: {
      index: { index: true },
      settings: { path: 'settings' },
    },
  },
};

await router.navigate({ name: 'dashboard.settings' });
```

## Route Context

Middleware and data loaders receive a `RouteContext`:

```ts
userDetail: {
  path: '/users/:id',
  middleware: [
    (ctx, next) => {
      ctx.params.id;    // typed to path params
      ctx.query.tab;    // resolved query (after coerceSearch)
      ctx.pathname;
      ctx.hash;
      ctx.historyState; // value from navigate({ ... }, { state: ... })
      ctx.locals;       // mutable bag shared across the middleware chain
      ctx.navigate;     // programmatic navigation
      return next();
    },
  ],
  data: async (ctx) => {
    ctx.signal; // AbortSignal — cancelled when navigation is superseded
    return fetchUser(ctx.params.id, { signal: ctx.signal });
  },
}
```

`ctx.locals` is mutable and shared through the entire middleware chain for one navigation. Use it to pass values from middleware to data loaders.

## Middleware

Middleware wraps the navigation using the familiar `async (ctx, next) => { ... }` shape.

```ts
const requireAuth = redirectTo({ name: 'login' }, { replace: true });

const loadCurrentUser = async (ctx, next) => {
  ctx.locals.user = await fetchCurrentUser();
  await next();
};
```

Order is fixed and simple:

```text
global middleware
  ↓
route middleware
  ↓
data()
```

### Guards

Use middleware for auth checks, redirects, analytics, and boundaries.

```ts
const requireAuth = async (ctx, next) => {
  if (!session.currentUser) {
    await ctx.navigate({ name: 'login' }, { replace: true });
    return; // do not call next()
  }
  ctx.locals.user = session.currentUser;
  await next();
};
```

For unconditional redirects, use the `redirectTo()` helper:

```ts
import { redirectTo } from '@vielzeug/wayfinder';

const requireAuth = redirectTo({ name: 'login' }, { replace: true });
```

For permanent URL aliases, use the declarative `redirect` field instead of middleware:

```ts
const routes = {
  profile: { path: '/profile', redirect: { name: 'userDetail' } },
  userDetail: { path: '/users/:id' },
};
```

> **Note:** `redirectTo()` calls `ctx.navigate()` internally, so `beforeLeave` guards will run and can block it. Declarative `redirect` on a route definition bypasses all leave guards.

### Leave Guards

Register a global leave guard with `router.beforeLeave()`. Return `false` to cancel navigation.

```ts
const removeGuard = router.beforeLeave(async (destination) => {
  if (!form.isDirty) return true;
  return confirm(`Discard changes? (navigating to ${destination.pathname})`);
});

// Remove when no longer needed:
removeGuard();
```

Scope a guard to fire only when leaving specific routes:

```ts
router.beforeLeave(async () => confirm('Discard changes?'), { routes: ['editor'] });
```

Declarative `redirect` routes bypass all leave guards.

### Data Loading

Use `data()` for route-local data acquisition. It receives the same route context plus an `AbortSignal`.

```ts
const routes = {
  userDetail: {
    path: '/users/:id',
    data: async ({ params, signal }) => fetchUser(params.id, { signal }),
  },
};
```

Access the result via the matched branch:

```ts
router.subscribe((state) => {
  const user = state.matches.at(-1)?.data;
  renderUser(user);
});
```

#### Per-route Error Boundaries

Use `onError` to handle data loader failures per-route. The returned value becomes `match.data`, allowing the route to render a degraded state:

```ts
const routes = {
  userDetail: {
    path: '/users/:id',
    data: async ({ params, signal }) => fetchUser(params.id, { signal }),
    onError: (error) => ({ error, user: null }),
  },
};
```

If `onError` itself throws, the router falls through to `status: 'error'` as usual.

### Search Param Validation

Validate and coerce `ctx.query` per route. The function receives raw URL strings (`QueryParams`). Throw to leave the parsed query unchanged.

```ts
const routes = {
  search: {
    path: '/search',
    coerceSearch: (raw) => ({
      q: String(raw.q ?? ''),
      page: Math.max(1, Number(raw.page ?? 1)),
    }),
    data: async ({ query }) => searchPosts(query.q, query.page),
  },
};
```

To apply the same coercion to every route, set `coerceSearch` on the router options instead. Per-route `coerceSearch` takes precedence over the global one.

```ts
const router = createRouter({
  coerceSearch: (raw) => ({ page: Number(raw.page ?? 1) }),
  routes,
});
```

### Error Boundaries

Wrap `await next()` in middleware for route-wide error handling. The thrown error is also stored on `router.getSnapshot().error`.

```ts
const boundary = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    reportRouteError(ctx.pathname, error);
    await ctx.navigate({ path: '/error' }, { replace: true });
  }
};

const router = createRouter({
  middleware: [boundary],
  routes,
});

// Check after navigation:
const { status, error } = router.getSnapshot();
if (status === 'error') {
  console.error(error);
}
```

## Navigation

### Named Navigation

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { replace: true });
await router.navigate({ name: 'search', query: { q: 'wayfinder' }, hash: 'results' });
await router.navigate({ name: 'dashboard.settings' });
```

### Raw Path Targets

```ts
await router.navigate({ path: '/marketing?utm_source=campaign' });
await router.navigate({ path: '/checkout#payment' }, { replace: true });
```

Use these when a destination does not belong in the route table. The same `navigate()` method covers named routes and raw path targets.

### History State

Attach arbitrary state to a history entry and read it back via `ctx.historyState` or `router.getSnapshot().location.historyState`.

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { state: { from: 'search' } });

// In data():
data: async (ctx) => {
  console.log(ctx.historyState); // { from: 'search' }
  return fetchUser(ctx.params.id);
},
```

### Same-URL Deduplication

```ts
await router.navigate({ name: 'dashboard' });
await router.navigate({ name: 'dashboard' }); // no-op
await router.navigate({ name: 'dashboard' }, { force: true }); // re-runs
```

### Leave Guards

Guard navigation until the user confirms — useful for unsaved-changes forms:

```ts
const removeGuard = router.beforeLeave(async (destination) => {
  if (!form.isDirty) return true;
  return confirm('Discard changes?');
});

// Remove when the component unmounts:
removeGuard();
```

Scope a guard to a specific route so it only fires when leaving that route:

```ts
router.beforeLeave(async () => confirm('Discard changes?'), { routes: ['editor'] });
```

## URLs and Active State

```ts
router.url('userDetail', { id: '42' });
router.url('userDetail', { id: '42' }, { tab: 'profile' });

router.isActive('userDetail');
router.isActive('users');
router.isActive('users', { exact: true });
```

`isActive(name)` reads the current router snapshot and is useful for parent navigation items.

## Match a Path Without Navigating

```ts
const branch = router.match('/app/dashboard/settings');

if (branch?.at(-1)?.name === 'dashboard.settings') {
  warmSettingsPanel();
}
```

`match()` strips the configured base automatically and returns the full matched branch (root to leaf). Data loaders are not executed.

## Load a Path for SSR

Use `router.load(url)` to load a full route state including data loader results without modifying router state or history. This is useful for server-side data prefetching.

```ts
const state = await router.load('/users/42');

if (state) {
  const data = state.matches.at(-1)?.data;
  // serialize and send to the client
}
```

Pass an `AbortSignal` via the options object to cancel in-flight loaders:

```ts
const controller = new AbortController();
const state = await router.load('/users/42', { signal: controller.signal });
```

`load()` follows declarative redirects (up to five hops). Middleware is not executed and its result is not reused by client navigation.

## Preload Client Navigation

Use `preload()` with the same typed named target accepted by `navigate()`. It executes route data loaders without changing router state or history, deduplicates concurrent work, and lets the next matching navigation consume the result.

```ts
await router.preload({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } });
```

Params and query values are part of the cache key. A navigation with different values runs its loaders normally.

## Coordinate Scroll and View Transitions

Keep commit-sensitive browser behavior on the router:

```ts
const router = createRouter({
  routes,
  scroll: (to, from) => (to.location.pathname === from.location.pathname ? 'preserve' : 'top'),
  viewTransition: true,
});

await router.navigate({ name: 'settings' }, { viewTransition: false });
```

`scroll` runs after a successful navigation and can return `'top'`, `'preserve'`, or `{ x, y }`. View transitions fall back to plain navigation when the browser API is unavailable.

## State and Subscriptions

```ts
router.subscribe((state) => {
  const leaf = state.matches.at(-1);
  console.log(leaf?.data);
});
```

Use `router.getSnapshot()` to read the current state synchronously:

```ts
const { location, matches, status, error } = router.getSnapshot();

location.pathname;
location.query; // raw parsed query strings (QueryParams)
location.hash;
location.historyState; // state from the current history entry

matches; // matched branch from root to leaf
status; // 'idle' | 'loading' | 'error'
error; // only set when status === 'error'
```

The state object is immutable. A successful navigation replaces it with a new snapshot.

### `waitFor(name)`

Wait for the router to reach `status: 'idle'` with a specific route active. Useful in tests and lifecycle coordination:

```ts
// Navigate and wait for data to settle
await router.navigate({ name: 'userDetail', params: { id: '42' } });
const state = await router.waitFor('userDetail');
const user = state.matches.at(-1)?.data;
```

`waitFor` rejects immediately if the router is already in `status: 'error'`, and also rejects if `router.dispose()` is called while the promise is pending. Resolves immediately if the named route is already active and idle.

## Testing

Use `createMemoryHistory` to test routers without a browser:

```ts
import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder';

const history = createMemoryHistory('/dashboard');
const router = createRouter({ history, routes });

// Use waitFor to avoid manual timing:
const state = await router.waitFor('dashboard');
assert(state.location.pathname === '/dashboard');

router.dispose();
```

## Cleanup

```ts
router.dispose();
```

Remove listeners, clear subscribers, and prevent future router usage.

## Build a Typed View Registry

Keep matching and data concerns in the route table while storing framework components, lazy factories, and static presentation metadata in an exhaustive registry:

```ts
const views = router.createViewRegistry(
  {
    home: { component: HomePage, title: 'Home' },
    settings: { component: SettingsPage, title: 'Settings' },
  },
  { notFound: { component: NotFoundPage, title: 'Not found' } },
);

const view = views.resolve(router.getSnapshot());
```

Every renderable route name is required; redirect-only routes are excluded. Unknown keys are rejected, and the fallback is explicit rather than relying on the router's internal not-found match name.

## Framework Integration

Route exposes `getSnapshot()` and `subscribe()`, which map directly to each framework's external-store primitives. Create the router once at module scope and bind actions outside the component lifecycle so references stay stable.

::: code-group

```tsx [React]
import { createRouter } from '@vielzeug/wayfinder';
import { useSyncExternalStore } from 'react';

const router = createRouter({
  routes: {
    home: { path: '/' },
    settings: { path: '/settings' },
  },
  notFound: { data: () => ({ message: 'Not found' }) },
});

// Stable router actions are safe to destructure outside the hook.
const { getSnapshot, isActive, navigate, subscribe, url } = router;

export function useRouter() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return { isActive, navigate, state, url };
}

// RouterView.tsx — exhaustive routes and an explicit fallback
const views = router.createViewRegistry(
  { home: HomePage, settings: SettingsPage },
  { notFound: NotFoundPage },
);

export function RouterView() {
  const { state } = useRouter();
  const Component = views.resolve(state);
  return Component ? <Component /> : null;
}
```

```ts [Vue 3]
import { createRouter } from '@vielzeug/wayfinder';
import { readonly, shallowRef } from 'vue';

const router = createRouter({
  routes: {
    home: { path: '/' },
    settings: { path: '/settings' },
  },
  notFound: { data: () => ({ message: 'Not found' }) },
});

// shallowRef — no need to deep-track immutable route state.
const state = shallowRef(router.getSnapshot());
router.subscribe((next) => {
  state.value = next;
});

export function useRouter() {
  const { isActive, navigate, url } = router;

  return { isActive, navigate, state: readonly(state), url };
}
```

```svelte [Svelte]
<!-- router.ts -->
<script lang="ts" context="module">
  import { createRouter } from '@vielzeug/wayfinder';
  import { readable } from 'svelte/store';

  const router = createRouter({
    routes: {
      home: { path: '/' },
      settings: { path: '/settings' },
    },
    notFound: { data: () => ({ message: 'Not found' }) },
  });

  // readable injects the initial value; subscribe() drives updates.
  export const routerState = readable(router.getSnapshot(), (set) => router.subscribe(set));
  export const { isActive, navigate, url } = router;
</script>
```

:::

For full RouterView and RouterLink patterns, see [React Integration](./examples/react-integration.md), [Vue Integration](./examples/vue-integration.md), and [Svelte Integration](./examples/svelte-integration.md).

## Debug Logging

`router.subscribe()` is the reactive subscription API — it receives every state change, including `loading` and `error` transitions. Attach a listener that logs to `console.debug` to inspect navigation without any dedicated debug tooling.

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({ routes });
const stop = router.subscribe((state) => {
  console.debug(`[wayfinder] ${state.status} ${state.location.pathname}`);
});

// Logged once the initial navigation completes:
// [wayfinder] idle /

// On navigate({ name: 'dashboard' }):
// [wayfinder] loading /dashboard
// [wayfinder] idle /dashboard
```

The returned function unsubscribes the listener — call it when the logger is no longer needed (e.g. on teardown):

```ts
stop();
```

Errors are surfaced on the state object, so you can log them explicitly:

```ts
router.subscribe((state) => {
  if (state.status === 'error') {
    console.error(`[wayfinder] ${state.location.pathname}`, state.error);
  }
});
```

Use a label when running multiple routers to distinguish their log output:

```ts
const main = createRouter({ routes });
main.subscribe((state) => console.debug(`[wayfinder:main] ${state.status} ${state.location.pathname}`));

const modal = createRouter({ routes: modalRoutes });
modal.subscribe((state) => console.debug(`[wayfinder:modal] ${state.status} ${state.location.pathname}`));
```

Debug logging has no effect on behavior and should not be enabled in production.

::: tip Unhandled router errors
If a route's data loader throws and no `onError` callback is set on the router, the error is surfaced via `console.error` in development and silenced in production (`__WAYFINDER_PROD__` set). Always provide an `onError` callback in production to handle errors explicitly.
:::

## Working with Other Vielzeug Libraries

### With Ward

Use Ward inside Wayfinder middleware to guard protected routes.

```ts
import { createRouter } from '@vielzeug/wayfinder';
import { createWard } from '@vielzeug/ward';

type User = { id: string; roles: string[] };

const ward = createWard([{ role: 'admin', resource: 'settings', action: 'view', effect: 'allow' }]);

const router = createRouter({
  middleware: [
    (ctx, next) => {
      const user: User = getSessionUser();
      if (!ward.can(user, 'settings', 'view')) return ctx.navigate({ path: '/login' }, { replace: true });
      return next();
    },
  ],
  routes: {
    settings: { path: '/settings' },
  },
});
```

### With Ripple

Sync router state to a Ripple signal for reactive UI.

```ts
import { createRouter } from '@vielzeug/wayfinder';
import { signal } from '@vielzeug/ripple';

const router = createRouter({
  /* ... */
});
const currentRoute = signal(router.getSnapshot().matches.at(-1)?.name ?? '');

router.subscribe((state) => {
  currentRoute.value = state.matches.at(-1)?.name ?? '';
});
```

## Best Practices

- Define the route table once at app startup and import it where needed.
- Prefer named navigation (`router.navigate({ name: 'settings' })`) over raw paths.
- Put auth and permission checks in middleware, not in data loaders.
- Use `data()` loaders for route data and honor the provided `AbortSignal`.
- Use `onError` on a route for degraded-state rendering rather than a full redirect to an error page.
- Use `notFound` in router options for the not-found page rather than `path: '*'` in the route table.
- Call `router.dispose()` when tearing down apps/tests to release listeners.
- Use `createMemoryHistory()` for tests and non-browser runtimes; avoid touching `window.history` directly.
