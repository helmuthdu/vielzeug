---
title: Routeit — Client-side router for TypeScript
description: Lightweight hash/history router with middleware, async handlers, View Transitions API, and reactive subscriptions. Zero dependencies.
---

<PackageBadges package="routeit" />

<img src="/logo-routeit.svg" alt="Routeit Logo" width="156" class="logo-highlight"/>

# Routeit

**Routeit** is a lightweight client-side router with middleware, async handlers, View Transitions API support, and reactive subscriptions.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/routeit
```

```sh [npm]
npm install @vielzeug/routeit
```

```sh [yarn]
yarn add @vielzeug/routeit
```

:::

## Quick Start

```ts
import { createRouter } from '@vielzeug/routeit';
import type { Middleware } from '@vielzeug/routeit';

// Create the router first so middleware can reference it
const router = createRouter({ viewTransitions: true });

// Global auth guard — applies to admin section via group()
const authGuard: Middleware = async (ctx, next) => {
  if (!isAuthenticated()) {
    router.navigate('/login');
    return;
  }
  await next();
};

router.routes([
  { path: '/',          handler: () => renderHome() },
  { path: '/users',     handler: () => renderUsers() },
  { path: '/users/:id', handler: ({ params }) => renderUser(params.id) },
  { path: '*',          handler: () => render404() },
]);

// Protected routes share the auth guard via group()
router.group('/admin', authGuard, (r) => {
  r.on('/dashboard', () => renderDashboard());
});

router.start();

// Navigate programmatically
router.navigate('/users/42');

// Subscribe to route changes — listener receives the new state directly
router.subscribe((state) => {
  console.log('Current path:', state.pathname);
});
```

## Features

- **Hash & history modes** — `createRouter({ mode: 'history' | 'hash' })`
- **Dynamic params** — `/users/:id` with params accessible in handler context
- **Middleware** — `async (ctx, next) => void` for auth guards, logging, etc.
- **View Transitions** — built-in `viewTransitions` option + per-`navigate()` override
- **Reactive** — `subscribe(listener)` returns an unsubscribe function
- **Zero dependencies** — <PackageInfo package="routeit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Route definition, middleware, navigation, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world routing patterns and framework integrations |
