---
title: Wayfinder — Usage Guide
description: Router setup, middleware, data loading, nested routes, and state patterns for Wayfinder.
---

[[toc]]

::: tip New to Wayfinder?
Start with the [Overview](./index.md), then use this page for the day-to-day API.
:::

## Basic Usage

```ts
import { createRouter, redirectTo } from '@vielzeug/wayfinder';

const routes = {
  home: {
    path: '/',
  },
  login: {
    path: '/login',
  },
  dashboard: {
    path: '/dashboard',
    middleware: [requireAuth],
    children: {
      index: {
        index: true,
      },
      settings: {
        path: 'settings',
        data: async () => fetchSettings(),
      },
    },
  },
  userDetail: {
    path: '/users/:id',
    data: async ({ params }) => fetchUser(params.id),
    meta: { title: 'User' },
  },
};

const router = createRouter({
  base: '/app',
  middleware: [logger],
  notFound: {
    component: NotFoundPage,
  },
  onError: (error, context) => reportError(error, context),
  routes,
  viewTransition: true,
});
```

`routes` is required. Wayfinder names come from the object keys, and object key order controls match precedence.

## Define Routes

Each route can provide these fields:

| Field          | Purpose                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `path`         | Match pattern                                                                                                               |
| `children`     | Nested child routes                                                                                                         |
| `index`        | Default child route that inherits the parent path                                                                           |
| `component`    | Optional view payload exposed on `match.component`                                                                          |
| `data`         | Abortable route data function. Result available as `match.data`. Supports streaming via `AsyncGenerator`.                   |
| `lazy`         | Lazy-load the module. Called once; result fills `data`, `component`, and `meta`.                                            |
| `meta`         | Static metadata exposed on `match.meta`                                                                                     |
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
    component: NotFoundPage,
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

#### Streaming Data Loaders

Return an `AsyncGenerator` from `data()` to stream partial results. Each `yield` updates `match.status` to `'streaming'` and `match.data` to the yielded value. The `return` value is the final settled data.

```ts
const routes = {
  feed: {
    path: '/feed',
    data: async function* ({ signal }) {
      const items: FeedItem[] = [];
      for await (const batch of streamFeedBatches({ signal })) {
        items.push(...batch);
        yield items; // stream partial results
      }
      return items; // final settled value
    },
  },
};
```

During streaming, `state.status` is `'streaming'` and each `match.status` reflects the loading state of that individual branch node.

### Lazy Routes

Defer loading a route module until first navigation. The factory is called at most once.

```ts
const routes = {
  settings: {
    path: '/settings',
    lazy: () => import('./pages/Settings'),
  },
};
```

The resolved object may contain `data`, `component`, and/or `meta`. Any present field overwrites the static definition.

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

### Prefetching

Eagerly run data loaders without navigating — useful for hover-prefetch:

```ts
anchor.addEventListener('mouseenter', () => {
  router.preload('userDetail', { id: '42' });
});
```

Concurrent calls for the same route+params are deduplicated. Results are consumed on the next navigation to the same route+query combination; a navigation with different query params runs the loaders fresh.

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

`isActive(name)` is useful for parent navigation items.

## Resolve Without Navigating

```ts
const branch = router.resolve('/app/dashboard/settings');

if (branch?.at(-1)?.name === 'dashboard.settings') {
  warmSettingsPanel();
}
```

`resolve()` strips the configured base automatically and returns the full matched branch (root to leaf). Data loaders are not executed.

## SSR Data Prefetch

Use `router.match(url)` to resolve a full route state including data loader results without modifying router state or history. Ideal for server-side data prefetching.

```ts
const state = await router.match('/users/42');

if (state) {
  const data = state.matches.at(-1)?.data;
  // serialize and send to the client
}
```

Pass an `AbortSignal` via the options object to cancel in-flight loaders:

```ts
const controller = new AbortController();
const state = await router.match('/users/42', { signal: controller.signal });
```

`match()` follows declarative redirects (up to five hops) and resolves lazy modules as a side effect.

## State and Subscriptions

```ts
router.subscribe((state) => {
  const leaf = state.matches.at(-1);
  document.title = (leaf?.meta as { title?: string } | undefined)?.title ?? 'App';
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
status; // 'idle' | 'loading' | 'streaming' | 'error'
error; // only set when status === 'error'
```

Each match node also carries its own `status`:

```ts
matches.at(-1)?.status; // 'idle' | 'loading' | 'streaming' | 'error'
```

This lets nested layouts show per-slot loading indicators without polling the top-level status.

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

## Scroll Restoration

Provide a `scroll` callback to control scroll position after each navigation:

```ts
const router = createRouter({
  routes,
  scroll: (to, from) => {
    // Return 'top' to scroll to top
    // Return { x, y } for a specific position
    // Return 'preserve' to do nothing
    return 'top';
  },
});
```

The callback receives the incoming state and the previous state, making it possible to implement saved-position restore:

```ts
const scrollPositions = new Map<string, { x: number; y: number }>();

router.subscribe((state) => {
  scrollPositions.set(state.location.pathname, { x: window.scrollX, y: window.scrollY });
});

const router = createRouter({
  routes,
  scroll: (to, _from) => scrollPositions.get(to.location.pathname) ?? 'top',
});
```

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

## Framework Integration

Route exposes `getSnapshot()` and `subscribe()`, which map directly to each framework's external-store primitives. Create the router once at module scope and bind actions outside the component lifecycle so references stay stable.

::: code-group

```tsx [React]
import { createRouter } from '@vielzeug/wayfinder';
import { useSyncExternalStore } from 'react';

const router = createRouter({
  routes: {
    home: { component: HomePage, path: '/' },
    settings: { component: SettingsPage, path: '/settings' },
  },
  notFound: { component: NotFoundPage },
});

// Stable references outside the hook — do not recreate on every render.
const getSnapshot = () => router.getSnapshot();
const subscribe = (cb: () => void) => router.subscribe(cb);
const navigate = router.navigate.bind(router);
const url = router.url.bind(router);
const isActive = router.isActive.bind(router);

export function useRouter() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return { isActive, navigate, state, url };
}

// RouterView.tsx
export function RouterView() {
  const { state } = useRouter();
  const Component = state.matches.at(-1)?.component as React.ComponentType | undefined;
  return Component ? <Component /> : null;
}
```

```ts [Vue 3]
import { createRouter } from '@vielzeug/wayfinder';
import { readonly, shallowRef } from 'vue';

const router = createRouter({
  routes: {
    home: { component: HomePage, path: '/' },
    settings: { component: SettingsPage, path: '/settings' },
  },
  notFound: { component: NotFoundPage },
});

// shallowRef — no need to deep-track immutable route state.
const state = shallowRef(router.getSnapshot());
router.subscribe((next) => {
  state.value = next;
});

export function useRouter() {
  return {
    isActive: router.isActive.bind(router),
    navigate: router.navigate.bind(router),
    state: readonly(state),
    url: router.url.bind(router),
  };
}
```

```svelte [Svelte]
<!-- router.ts -->
<script lang="ts" context="module">
  import { createRouter } from '@vielzeug/wayfinder';
  import { readable } from 'svelte/store';

  const router = createRouter({
    routes: {
      home: { component: HomePage, path: '/' },
      settings: { component: SettingsPage, path: '/settings' },
    },
    notFound: { component: NotFoundPage },
  });

  // readable injects the initial value; subscribe() drives updates.
  export const routerState = readable(router.getSnapshot(), (set) => router.subscribe(set));
  export const navigate = router.navigate.bind(router);
  export const url = router.url.bind(router);
  export const isActive = router.isActive.bind(router);
</script>
```

:::

For full RouterView and RouterLink patterns, see [React Integration](./examples/react-integration.md), [Vue Integration](./examples/vue-integration.md), and [Svelte Integration](./examples/svelte-integration.md).

## Debug Mode

Import `debugRouter` from the dedicated sub-path to create a router with navigation logging pre-enabled. The sub-path is tree-shaken from production bundles when not imported.

```ts
import { debugRouter } from '@vielzeug/wayfinder/devtools';

const router = debugRouter({
  routes: {
    home: { path: '/' },
    dashboard: { path: '/dashboard', data: () => fetchDashboard() },
  },
});

// Logged once the initial navigation completes:
// [wayfinder:nav] idle      /         [home]

// On navigate({ name: 'dashboard' }):
// [wayfinder:nav] loading   /dashboard
// [wayfinder:nav] idle      /dashboard [dashboard]
```

The router returned is identical to `createRouter()` — all methods (`navigate`, `subscribe`, `waitFor`, etc.) work the same way.

Errors are logged with the error object appended:

```ts
// [wayfinder:nav] error     /dashboard [dashboard]  Error: fetch failed
```

Use the `label` option when running multiple routers to distinguish their log output:

```ts
const main = debugRouter({ routes, label: 'main' });
const modal = debugRouter({ routes: modalRoutes, label: 'modal' });
// [wayfinder:main]  loading  /products
// [wayfinder:modal] loading  /confirm
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
- Use `router.preload()` on hover for routes likely to be visited next.
