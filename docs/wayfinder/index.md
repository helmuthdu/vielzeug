---
title: Wayfinder — Client-side router for TypeScript
description: Framework-agnostic client-side router with typed params, async data loading, middleware, leave guards, and View Transitions support.
package: wayfinder
category: routing
keywords: [router, client-side, middleware, guards, navigation, history, spa, typed-routes]
related: [ripple, ward, herald]
exports: [createRouter, createBrowserHistory, createMemoryHistory, redirectTo]
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

| Feature                              | Wayfinder                                       | page.js | Navigo  |
| ------------------------------------ | ----------------------------------------------- | ------- | ------- |
| Bundle size                          | <PackageInfo package="wayfinder" type="size" /> | ~1 kB   | ~5 kB   |
| History mode                         | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="check" size="16"></sg-icon>      |
| Memory history (tests / non-browser) | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Typed path params                    | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Named navigation                     | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | Partial |
| Middleware                           | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="check" size="16"></sg-icon>      |
| Data loaders with AbortSignal        | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Lazy route loading                   | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Declarative redirects                | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Search param validation              | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Error in state                       | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| History state in context             | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Leave guards                         | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Hover prefetching (`preload()`)      | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Scroll restoration                   | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| View Transition API                  | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="x" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>      |
| Zero dependencies                    | <sg-icon name="check" size="16"></sg-icon>                                              | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="check" size="16"></sg-icon>      |

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

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    home: { path: '/' },
    dashboard: {
      path: '/dashboard',
      children: {
        index: { index: true },
        settings: {
          path: 'settings',
          data: async () => fetchSettings(),
        },
      },
    },
  },
  notFound: { component: NotFoundPage },
});

await router.navigate({ name: 'dashboard.settings' });
```

## Features

<div class="features-grid">

- One declarative route table with nested names (`dashboard.settings`)
- Named and raw-path navigation through one `navigate()` API
- Lazy-load route modules on first navigation
- Middleware for guards, analytics, and error boundaries
- Route `data()` loaders with `AbortSignal` cancellation and async-generator streaming
- Per-match `status` for granular loading/streaming feedback in nested layouts
- Global `beforeLeave` leave guards with optional route scoping
- Typed and coercible search params via `coerceSearch`
- Per-route `onError` boundaries for degraded data states
- Declarative `notFound` fallback in router options
- Hover-prefetch via `router.preload()`
- Branch resolve without navigation via `router.resolve()`
- SSR data prefetch via `router.match(url)`
- Scroll restoration via the `scroll` option
- History entry state readable as `ctx.historyState`
- Errors from data loaders exposed on `router.getSnapshot().error`
- `router.waitFor(name)` for lifecycle coordination and testing
- Memory history for tests and non-browser environments
- Wildcard routes for catch-all cases
- Base-path support for app subdirectories
- View Transition API with per-navigation override
- **Debug logging** via `debugRouter()` (`@vielzeug/wayfinder/devtools`) — logs every navigation phase change with `[wayfinder:nav]` prefixes; tree-shaken from production bundles

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — reactive signals; sync router state to a signal for framework-agnostic reactivity
- [Ward](/ward/) — permission guards; use inside Wayfinder middleware to protect routes
- [Herald](/herald/) — event bus; dispatch route-change events to decouple navigation side effects

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
