---
title: Wayfinder — Usage Guide
description: Router setup, middleware, data loading, nested routes, and state patterns for Wayfinder.
---

[[toc]]

::: tip New to Wayfinder?
Start with the [Overview](./index.md), then use this page for the day-to-day API.
:::

## Create a Router

```ts
import { createRouter, redirectTo } from '@vielzeug/wayfinder';

const routes = {
  home: {
    path: '/',
    handler: () => renderHome(),
  },
  login: {
    path: '/login',
    handler: () => renderLogin(),
  },
  dashboard: {
    path: '/dashboard',
    middleware: [requireAuth],
    children: {
      index: {
        index: true,
        handler: () => renderDashboard(),
      },
      settings: {
        path: 'settings',
        data: async () => fetchSettings(),
        handler: ({ data }) => renderSettings(data),
      },
    },
  },
  userDetail: {
    path: '/users/:id',
    data: async ({ params }) => fetchUser(params.id),
    handler: ({ data }) => renderUser(data),
    meta: { title: 'User' },
  },
  notFound: {
    path: '*',
    handler: () => renderNotFound(),
  },
};

const router = createRouter({
  base: '/app',
  middleware: [logger],
  onError: (error, context) => reportError(error, context.source),
  routes,
  viewTransition: true,
});
```

`routes` is required. Wayfinder names come from the object keys, and object key order controls match precedence.

## Define Routes Once

Each route can provide these fields:

| Field          | Purpose                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| `path`         | Match pattern                                                              |
| `children`     | Nested child routes                                                        |
| `index`        | Default child route that inherits the parent path                          |
| `component`    | Optional view payload exposed on `router.getSnapshot().matches.at(-1)?.component`  |
| `data`         | Abortable route data function that runs after middleware                   |
| `handler`      | Final route handler                                                        |
| `lazy`         | Lazy-load the module. Called once; result fills `handler`, `data`, `component`, `meta`. |
| `meta`         | Static data exposed on `router.getSnapshot().matches.at(-1)?.meta`                 |
| `middleware`   | Route-specific middleware                                                  |
| `onLeave`      | Per-route leave guard. Return `false` to block navigation away from this route. |
| `redirect`     | Declarative permanent redirect. Resolved before middleware runs.           |
| `coerceSearch` | Coerce raw URL search strings into typed values. Return value replaces `ctx.query`. Throw to leave the raw query unchanged. |

Use wildcard routes for fallback behavior:

```ts
const routes = {
  docs: { path: '/docs/*', handler: () => renderDocs() },
  notFound: { path: '*', handler: () => renderNotFound() },
};
```

Nested routes compose naturally and create compound route names:

```ts
const routes = {
  dashboard: {
    path: '/dashboard',
    children: {
      index: { index: true, handler: () => renderDashboardHome() },
      settings: { path: 'settings', handler: () => renderSettings() },
    },
  },
};

await router.navigate({ name: 'dashboard.settings' });
```

## Route Context

Handlers and middleware receive a `RouteContext`:

```ts
userDetail: {
  path: '/users/:id',
  handler: (ctx) => {
    ctx.data;         // result of this route's data()
    ctx.params.id;
    ctx.query.tab;
    ctx.pathname;
    ctx.hash;
    ctx.historyState; // value from navigate({ ... }, { state: ... })
    ctx.locals;
    ctx.navigate;
  },
}
```

`ctx.locals` is mutable and shared through the active middleware chain.

`ctx.data` is only populated for the final handler. Middleware always runs before `data()`.

## Middleware

Middleware wraps the handler using the familiar `async (ctx, next) => { ... }` shape.

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
data
  ↓
handler
```

### Guards

Use middleware for auth checks, redirects, analytics, and boundaries.

```ts
const requireAuth = redirectTo({ name: 'login' }, { replace: true });
```

For permanent URL aliases, use the declarative `redirect` field instead of middleware:

```ts
const routes = {
  profile: { path: '/profile', redirect: { name: 'userDetail' } },
  userDetail: { path: '/users/:id', handler: renderUser },
};
```

### Leave Guards

Guard navigation away from a specific route with the per-route `onLeave` field, or register a global guard with `router.beforeLeave()`.

```ts
const routes = {
  editor: {
    path: '/editor',
    onLeave: async () => {
      if (!form.isDirty) return true;
      return confirm('Discard changes?');
    },
    handler: () => renderEditor(),
  },
};
```

Global guards are registered after the router is created:

```ts
const removeGuard = router.beforeLeave(async () => {
  if (!analytics.pendingFlush) return true;
  await analytics.flush();
  return true;
});

// Remove when no longer needed:
removeGuard();
```

When both are present, the per-route `onLeave` fires first (leaf → root), then the global `beforeLeave` guards in registration order.

### Data Loading

Use `data()` for route-local data acquisition. It receives the same route context plus an `AbortSignal`.

```ts
const routes = {
  userDetail: {
    path: '/users/:id',
    data: async ({ params, signal }) => fetchUser(params.id, { signal }),
    handler: ({ data }) => renderUser(data),
  },
};
```

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

The resolved object may contain `handler`, `data`, `component`, and/or `meta`. Any present field overwrites the static definition.

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
    handler: ({ query }) => renderSearch(query.q, query.page),
  },
};
```

### Error Boundaries

Wrap `await next()` in middleware. The thrown error is also stored on `router.getSnapshot().error`.

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

// In the handler:
handler: (ctx) => {
  console.log(ctx.historyState); // { from: 'search' }
};
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

Concurrent calls for the same route+params are deduplicated. Results are discarded after the next navigation; the loaders will run again with a fresh `AbortSignal` on the actual visit.

### Leave Guards

Guard navigation until the user confirms — useful for unsaved-changes forms:

```ts
const removeGuard = router.beforeLeave(async () => {
  if (!form.isDirty) return true;
  return confirm('Discard changes?');
});

// Remove when the component unmounts:
removeGuard();
```

For guards that belong to a specific route, use `onLeave` in the route definition instead (see [Define Routes Once](#define-routes-once)).

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

Use `router.match(url, signal?)` to resolve a full route state including data loader results without modifying router state or history. Ideal for server-side data prefetching.

```ts
const state = await router.match('/users/42');

if (state) {
  const data = state.matches.at(-1)?.data;
  // serialize and send to the client
}
```

Pass an `AbortSignal` to cancel in-flight loaders:

```ts
const controller = new AbortController();
const state = await router.match('/users/42', controller.signal);
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
location.query;        // raw parsed query strings (QueryParams)
location.hash;
location.historyState; // state from the current history entry

matches;               // matched branch from root to leaf
status;                // 'idle' | 'loading' | 'error'
error;                 // only set when status === 'error'
```

The state object is immutable. A successful navigation replaces it with a new snapshot.

`matches` contains the matched branch from root to leaf. Access route metadata via the leaf match: `matches.at(-1)?.meta`. Note that `location.query` always contains raw string values from URL parsing. For coerced values, read `ctx.query` inside middleware or handlers.

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

await new Promise((r) => setTimeout(r, 0));
assert(router.getSnapshot().location.pathname === '/dashboard');

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
    notFound: { component: NotFoundPage, path: '*' },
  },
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
    notFound: { component: NotFoundPage, path: '*' },
  },
});

// shallowRef — no need to deep-track immutable route state.
const state = shallowRef(router.getSnapshot());
router.subscribe((next) => { state.value = next; });

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
      notFound: { component: NotFoundPage, path: '*' },
    },
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
    settings: { handler: () => renderSettings(), path: '/settings' },
  },
});
```

### With Ripple

Sync router state to a Ripple signal for reactive UI outside route handlers.

```ts
import { createRouter } from '@vielzeug/wayfinder';
import { signal } from '@vielzeug/ripple';

const router = createRouter({ /* ... */ });
const currentRoute = signal(router.getSnapshot().matches.at(-1)?.name ?? '');

router.subscribe((state) => {
  currentRoute.value = state.matches.at(-1)?.name ?? '';
});
```

## Best Practices

- Define the route table once at app startup and import it where needed.
- Prefer named navigation (`router.navigate({ name: 'settings' })`) over raw paths.
- Put auth and permission checks in middleware, not in route handlers.
- Use `data()` loaders for route data and honor the provided `AbortSignal`.
- Call `router.dispose()` when tearing down apps/tests to release listeners.
- Use `createMemoryHistory()` for tests and non-browser runtimes; avoid touching `window.history` directly.
- Use `router.preload()` on hover for routes likely to be visited next.
