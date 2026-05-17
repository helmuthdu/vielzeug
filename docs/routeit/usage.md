---
title: Routeit — Usage Guide
description: Router setup, middleware, data loading, nested routes, and state patterns for Routeit.
---

[[toc]]

::: tip New to Routeit?
Start with the [Overview](./index.md), then use this page for the day-to-day API.
:::

## Create a Router

```ts
import { createRouter, redirectTo } from '@vielzeug/routeit';

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

`routes` is required. Route names come from the object keys, and object key order controls match precedence.

## Define Routes Once

Each route can provide these fields:

| Field          | Purpose                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| `path`         | Match pattern                                                              |
| `children`     | Nested child routes                                                        |
| `index`        | Default child route that inherits the parent path                          |
| `data`         | Abortable route data function that runs after middleware                   |
| `handler`      | Final route handler                                                        |
| `lazy`         | Lazy-load the module. Called once; result fills `handler`, `data`, `meta`. |
| `meta`         | Static data exposed on `router.state.matches.at(-1)?.meta`                 |
| `middleware`   | Route-specific middleware                                                  |
| `redirect`     | Declarative permanent redirect. Resolved before middleware runs.           |
| `coerceSearch` | Coerce search params. Return value replaces `ctx.query`.                   |

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

The resolved object may contain `handler`, `data`, and/or `meta`. Any present field overwrites the static definition.

### Search Param Validation

Validate and coerce `ctx.query` per route. Throw to leave the raw query unchanged.

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

Wrap `await next()` in middleware. The thrown error is also stored on `router.state.error`.

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
if (router.state.status === 'error') {
  console.error(router.state.error);
}
```

## Navigation

### Named Navigation

```ts
await router.navigate({ name: 'userDetail', params: { id: '42' } });
await router.navigate({ name: 'userDetail', params: { id: '42' } }, { replace: true });
await router.navigate({ name: 'search', query: { q: 'routeit' }, hash: 'results' });
await router.navigate({ name: 'dashboard.settings' });
```

### Raw Path Targets

```ts
await router.navigate({ path: '/marketing?utm_source=campaign' });
await router.navigate({ path: '/checkout#payment' }, { replace: true });
```

Use these when a destination does not belong in the route table. The same `navigate()` method covers named routes and raw path targets.

### History State

Attach arbitrary state to a history entry and read it back via `ctx.historyState` or `router.state.location.historyState`.

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

Concurrent calls for the same route+params are deduplicated. A subsequent `navigate()` re-runs the loaders with a fresh signal.

### Leave Guards

Block navigation until the user confirms — useful for unsaved-changes forms:

```ts
const removeGuard = router.beforeLeave(async () => {
  if (!form.isDirty) return true;
  return confirm('Discard changes?');
});

// Remove when the component unmounts:
removeGuard();
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
const match = router.resolve('/app/dashboard/settings');

if (match?.at(-1)?.name === 'dashboard.settings') {
  warmSettingsPanel();
}
```

`resolve()` strips the configured base automatically and returns the full matched branch.

## State and Subscriptions

```ts
router.subscribe((state) => {
  const leaf = state.matches.at(-1);
  document.title = (leaf?.meta as { title?: string } | undefined)?.title ?? 'App';
});

router.state.location.pathname;
router.state.location.query;
router.state.location.hash;
router.state.location.historyState; // state from the current history entry
router.state.matches;
router.state.status; // 'idle' | 'loading' | 'error'
router.state.error; // only set when status === 'error'
```

The state object is immutable. A successful navigation replaces it with a new snapshot.

`router.state.matches` contains the matched branch from root to leaf. Access route metadata via the leaf match: `state.matches.at(-1)?.meta`.

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
import { createMemoryHistory, createRouter } from '@vielzeug/routeit';

const history = createMemoryHistory('/dashboard');
const router = createRouter({ history, routes });

await new Promise((r) => setTimeout(r, 0));
assert(router.state.location.pathname === '/dashboard');

router.dispose();
```

## Cleanup

```ts
router.dispose();
```

Remove listeners, clear subscribers, and prevent future router usage.

## Framework Integration

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';
import { createRouter, createBrowserHistory } from '@vielzeug/routeit';

const router = createRouter({
  history: createBrowserHistory(),
  routes: {
    home: { path: '/', handler: () => null },
    about: { path: '/about', handler: () => null },
  },
});

function useRouterState() {
  return useSyncExternalStore(
    (notify) => router.subscribe(() => notify()),
    () => router.state,
  );
}

function App() {
  const { location, matches } = useRouterState();
  const current = matches.at(-1);
  return (
    <div>
      <nav>
        <a href="/" onClick={(e) => { e.preventDefault(); router.navigate({ name: 'home' }); }}>Home</a>
        <a href="/about" onClick={(e) => { e.preventDefault(); router.navigate({ name: 'about' }); }}>About</a>
      </nav>
      <main>{current?.route.name}</main>
    </div>
  );
}
```

```ts [Vue 3]
import { shallowRef, onScopeDispose } from 'vue';
import { createRouter, createBrowserHistory } from '@vielzeug/routeit';

const router = createRouter({
  history: createBrowserHistory(),
  routes: {
    home: { path: '/', handler: () => null },
    about: { path: '/about', handler: () => null },
  },
});

function useRouter() {
  const state = shallowRef(router.state);
  const stop = router.subscribe(() => { state.value = router.state; });
  onScopeDispose(() => stop());
  return { state, navigate: router.navigate.bind(router) };
}
```

```svelte [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createRouter, createBrowserHistory } from '@vielzeug/routeit';

  const router = createRouter({
    history: createBrowserHistory(),
    routes: {
      home: { path: '/', handler: () => null },
      about: { path: '/about', handler: () => null },
    },
  });

  let state = router.state;
  const stop = router.subscribe(() => { state = router.state; });
  onDestroy(() => { stop(); router.dispose(); });
</script>

<nav>
  <a href="/" on:click|preventDefault={() => router.navigate({ name: 'home' })}>Home</a>
</nav>
<main>{state.matches.at(-1)?.route.name}</main>
```

:::


### Pitfalls

- **React:** Returning `router.currentRoute()` directly as the snapshot function works correctly because Routeit always returns the same object reference for the current route — but ensure the function is stable (defined outside the component).
- **Vue 3:** Use `shallowRef` not `ref` for the route object — deep reactivity on a route object is unnecessary and adds overhead.
- **Svelte:** Not calling `unsub()` in `onDestroy` causes the router to retain a reference to a destroyed component's callback, leading to errors when the route changes after unmount.

## Working with Other Vielzeug Libraries

### With Permit

Use permit inside Routeit middleware to guard protected routes.

```ts
import { createRouter } from '@vielzeug/routeit';
import { createPermit } from '@vielzeug/permit';

type User = { id: string; roles: string[] };

const permit = createPermit([
  { role: 'admin', resource: 'settings', action: 'view', effect: 'allow' },
]);

const router = createRouter({
  routes: {
    settings: { path: '/settings', handler: () => renderSettings() },
  },
  middleware: [(ctx, next) => {
    const user: User = getSessionUser();
    if (!permit.can(user, 'settings', 'view')) {
      return ctx.navigate({ path: '/login', replace: true });
    }
    return next();
  }],
});
```

### With Stateit

Sync router state to a Stateit signal for reactive UI outside the router's subscription.

```ts
import { createRouter } from '@vielzeug/routeit';
import { signal } from '@vielzeug/stateit';

const router = createRouter({ /* ... */ });
const currentRoute = signal(router.state.matches.at(-1)?.route.name ?? '');

router.subscribe(() => {
  currentRoute.value = router.state.matches.at(-1)?.route.name ?? '';
});
```

## Best Practices

- Define the route table once at app startup and import it where needed — avoid building route tables at runtime.
- Use named navigation (`router.navigate({ name: 'settings' })`) over raw paths to detect broken links at compile time.
- Put auth and permission guards in middleware, not in route handlers.
- Use `data()` loaders for per-route data fetching with AbortSignal — avoid fetching inside handlers.
- Call `router.dispose()` when unmounting the app (tests, SSR responses) to prevent background listeners.
- Use `createMemoryHistory()` for server-side rendering and tests; never reference `window.history` directly.
- Use `router.preload()` on hover for navigation that is likely to be followed immediately.
