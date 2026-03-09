---
title: Permit — Role-based access control for TypeScript
description: Lightweight, type-safe RBAC with wildcard roles, dynamic permission functions, and anonymous user support. Zero dependencies.
---

<PackageBadges package="permit" />

<img src="/logo-permit.svg" alt="Permit Logo" width="156" class="logo-highlight"/>

# Permit

**Permit** is a zero-dependency role-based access control (RBAC) library with wildcard roles, dynamic permission functions, and anonymous user support.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/permit
```

```sh [npm]
npm install @vielzeug/permit
```

```sh [yarn]
yarn add @vielzeug/permit
```

:::

## Quick Start

```ts
import { createPermit, hasRole, WILDCARD, ANONYMOUS } from '@vielzeug/permit';

const permit = createPermit();

// Shorthand setup — grant/deny multiple actions at once
permit
  .grant('admin', WILDCARD, 'read', 'write', 'delete')
  .grant('editor', 'posts', 'read')
  .register('editor', 'posts', { write: (user, data) => user.id === data?.authorId })
  .grant(ANONYMOUS, 'posts', 'read'); // public read

const user = { id: 'u1', roles: ['editor'] };

// Direct check
permit.check(user, 'posts', 'read');                       // true
permit.check(user, 'posts', 'write', { authorId: 'u1' }); // true
permit.check(user, 'posts', 'delete');                     // false

// Pre-bound guard with canAll / canAny
const guard = permit.for(user);
guard.can('posts', 'read');                  // true
guard.canAll('posts', ['read', 'write']);    // true
guard.canAny('posts', ['write', 'delete']);  // true
guard.can('posts', 'delete');                // false

// Check role membership
hasRole(user, 'editor'); // true
```

## Features

- **Role-based rules** — map roles to resources and any string actions
- **`grant` / `deny` shorthands** — boolean shortcuts without writing `{ action: true/false }` objects
- **Dynamic permissions** — use functions `(user, data) => boolean` for context-aware rules
- **Wildcard role/resource** — `'*'` applies to all users or all resources
- **Partial wildcard override** — specific resources override individual wildcard actions, inheriting the rest
- **First-match-wins** — explicit `false` on an earlier role stops the chain
- **Anonymous users** — automatic `anonymous` role for null/unauthenticated users
- **Pre-bound guards** — `permit.for(user)` returns a `PermitGuard` with `can`, `canAny`, `canAll`
- **Fluent API** — all write methods return the permit instance for chaining
- **Snapshot / restore** — export and re-import the full permission set as a plain object
- **TypeScript generics** — type your user shape with `createPermit<MyUser>()`
- **Zero dependencies** — <PackageInfo package="permit" type="size" /> gzipped, <PackageInfo package="permit" type="dependencies" /> dependencies

## Next Steps

|                           |                                                     |
| ------------------------- | --------------------------------------------------- |
| [Usage Guide](./usage.md) | Role setup, wildcards, dynamic rules, and testing   |
| [API Reference](./api.md) | Complete type signatures and method documentation   |
| [Examples](./examples.md) | Real-world RBAC patterns and framework integrations |
