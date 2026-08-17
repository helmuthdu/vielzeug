---
title: Wayfinder — Migration
description: Migrate to the breaking Wayfinder navigation and path-inspection APIs.
---

[[toc]]

## Wayfinder 2.0

Wayfinder 2.0 removes unused exports, dead code, and internal type aliases to shrink the public surface and align with monorepo conventions.

Removed exports:

- `WayfinderError.is()` (static type guard)
- `MatchStatus` (type alias of `NavigationStatus`)
- `RouterErrorSource` (type alias of `RouterErrorContext['source']`)
- `RouteChildren` (internal type leaked to public exports)
- `devOnly` (internal helper leaked to public exports)

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

### Replace `MatchStatus` with `NavigationStatus`

`MatchStatus` was a pure alias of `NavigationStatus` with no semantic distinction. Use `NavigationStatus` directly.

```ts
// Before
import { MatchStatus } from '@vielzeug/wayfinder';

const status: MatchStatus = match.status;
```

```ts
// After
import { NavigationStatus } from '@vielzeug/wayfinder';

const status: NavigationStatus = match.status;
```

### Replace `RouterErrorSource`

The convenience alias `RouterErrorSource = RouterErrorContext['source']` is removed. Access the union via `RouterErrorContext['source']` or use the string literals directly.

```ts
// Before
import { RouterErrorSource } from '@vielzeug/wayfinder';

const source: RouterErrorSource = context.source;
```

```ts
// After
import { RouterErrorContext } from '@vielzeug/wayfinder';

const source: RouterErrorContext['source'] = context.source;
```

### Remove `RouteChildren` imports

`RouteChildren` was an internal type leaked to public exports. It is no longer exported. If you referenced it in type annotations, inline the definition or use `Record<string, RouteDefinition>`.

```ts
// Before
import { RouteChildren } from '@vielzeug/wayfinder';

const children: RouteChildren = { ... };
```

```ts
// After
import { RouteDefinition } from '@vielzeug/wayfinder';

const children: Record<string, RouteDefinition> = { ... };
```

## Rename Path Inspection APIs

Replace the former synchronous `resolve()` API with `match()`. It inspects the route branch without running middleware or data loaders.

```ts
// Before
const branch = router.resolve('/users/42');

// After
const branch = router.match('/users/42');
```

Replace the former asynchronous `match()` API with `load()`. It resolves lazy modules and runs data loaders without changing router state or history.

```ts
// Before
const state = await router.match('/users/42');

// After
const state = await router.load('/users/42');
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

### Upgrade Checklist

- Replace `WayfinderError.is(err)` with `err instanceof WayfinderError`.
- Replace `MatchStatus` imports with `NavigationStatus`.
- Replace `RouterErrorSource` imports with `RouterErrorContext['source']`.
- Remove `RouteChildren` imports — inline as `Record<string, RouteDefinition>`.
- Remove `devOnly` imports — use `import.meta.env.DEV` or your own dev guard.
