---
title: Wayfinder — Client-side router for TypeScript
description: Framework-agnostic client-side router with typed params, async data loading, middleware, leave guards, and View Transitions support.
package: wayfinder
category: routing
keywords: [router, client-side, middleware, guards, navigation, history, spa, typed-routes]
related: [ripple, ward, herald]
exports: [createRouter, createBrowserHistory, createMemoryHistory, redirectTo, WayfinderError, WayfinderApiError, WayfinderDisposedError, WayfinderRedirectLoopError, WayfinderRouteError, debugRouter]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="wayfinder" />

## Why Wayfinder?

Managing navigation by hand means scattered `popstate` listeners, duplicated path checks, and no shared abstraction for loading data or blocking navigation. Wayfinder moves all of that into one declarative table.

```ts
// Before — manual navigation with popstate
window.addEventListener('popstate', () => {
  const path = window.location.pathname;
  if (path === '/') renderHome();
  else if (path.startsWith('/dashboard')) renderDashboard();
  else renderNotFound();
});
document.querySelectorAll('a[data-route]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    history.pushState({}, '', (e.currentTarget as HTMLAnchorElement).href);
    dispatchEvent(new PopStateEvent('popstate'));
  });
});

// After — with Wayfinder
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    home: { path: '/' },
    dashboard: { path: '/dashboard' },
  },
  notFound: { component: NotFoundPage },
});

router.subscribe((state) => {
  render(state.matches.at(-1)?.component);
});
```

<div class="decision-callout">

**Use Wayfinder when** you need named navigation, route-level data loading with cancellation, middleware, or leave guards in a framework-agnostic setup.

**Consider a framework's built-in router when** you are deep in a single framework ecosystem (React Router, Vue Router) and want first-class component binding with no adapter layer.

</div>

| Feature                              | Wayfinder                                       | page.js                                    | Navigo                                     |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Bundle size                          | <PackageInfo package="wayfinder" type="size" /> | ~1 kB                                      | ~5 kB                                      |
| History mode                         | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Memory history (tests / non-browser) | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Typed path params                    | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Named navigation                     | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | Partial                                    |
| Middleware                           | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Data loaders with AbortSignal        | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Lazy route loading                   | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Declarative redirects                | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Search param validation              | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Error in state                       | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| History state in context             | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Leave guards                         | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Hover prefetching (`preload()`)      | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Scroll restoration                   | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| View Transition API                  | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Zero dependencies                    | <ore-icon name="check" size="16"></ore-icon>      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/wayfinder
```

```sh [npm]
npm install @vielzeug/wayfinder
```

```sh [yarn]
yarn add @vielzeug/wayfinder
```

:::

## Quick Start

Create a memory-backed router, wait for initial routing, then navigate by name.

```ts
import { createMemoryHistory, createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  history: createMemoryHistory('/'),
  routes: {
    home: { path: '/' },
    settings: { path: '/settings' },
  },
});

await router.ready;
await router.navigate({ name: 'settings' });
console.log(router.getSnapshot().location.pathname); // /settings
router.dispose();
```

## Features

<div class="features-grid">

- `createRouter()` — Compiles named, nested route tables.
- `navigate()` — Commits route changes after middleware reaches its terminal stage.
- `ready` — Signals that initial routing has settled.
- `data()` — Receives cancellation through `AbortSignal` and can stream async-generator updates.
- `beforeLeave()` — Blocks route exits before history changes.
- `match()` / `load()` — Inspect routes synchronously or load route data without navigation.
- `preload()` — Warms route data for a later matching navigation.
- `createMemoryHistory()` — Runs routers in tests and non-browser environments.
- `debugRouter()` — Logs navigation state from `@vielzeug/wayfinder/devtools`.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — reactive signals; sync router state to a signal for framework-agnostic reactivity
- [Ward](/ward/) — permission guards; use inside Wayfinder middleware to protect routes
- [Herald](/herald/) — event bus; dispatch route-change events to decouple navigation side effects

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
