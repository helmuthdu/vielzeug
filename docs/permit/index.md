---
title: Permit — Role-based access control for TypeScript
description: Lightweight, type-safe RBAC with role inheritance, wildcard roles/resources/actions, dynamic permission functions, and anonymous user support. Zero dependencies.
---

<PackageBadges package="permit" />

<img src="/logo-permit.svg" alt="Permit Logo" width="156" class="logo-highlight"/>

# Permit

**Permit** is a zero-dependency role-based access control (RBAC) library with role inheritance, wildcard roles/resources/actions, dynamic permission functions, and anonymous user support.

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

// Build a role hierarchy then define permissions
permit
  .grant('viewer', WILDCARD, 'read')
  .extend('editor', 'viewer') // editor inherits viewer
  .define('editor', 'posts', { write: (u, d) => u.id === d?.authorId })
  .extend('admin', 'editor') // admin inherits editor
  .grant('admin', WILDCARD, 'delete')
  .grant(ANONYMOUS, 'posts', 'read'); // public read

const user = { id: 'u1', roles: ['editor'] };

// Direct checks
permit.check(user, 'posts', 'read'); // true  (inherited from viewer)
permit.check(user, 'posts', 'write', { authorId: 'u1' }); // true  (dynamic rule)
permit.check(user, 'posts', 'delete'); // false

// Multi-action checks
permit.checkAll(user, 'posts', ['read', 'write'], { authorId: 'u1' }); // true
permit.checkAny(user, 'posts', ['write', 'delete']); // true

// Pre-bound guard for the same user
const guard = permit.for(user);
guard.can('posts', 'read'); // true
guard.canAll('posts', ['read', 'write'], { authorId: 'u1' }); // true
guard.canAny('posts', ['write', 'delete']); // true
guard.can('posts', 'delete'); // false

// Check role membership
hasRole(user, 'editor'); // true
```

## Features

- **Role-based rules** — map roles to resources and any string actions
- **Role inheritance** — `extend(child, parent)` with multi-level BFS resolution
- **`grant` / `deny` shorthands** — boolean shortcuts without writing `{ action: true/false }` objects
- **Dynamic permissions** — use functions `(user, data) => boolean` for context-aware rules
- **Wildcard role / resource / action** — `'*'` applies to all users, all resources, or any action
- **Partial wildcard override** — specific resources override individual wildcard actions, inheriting the rest
- **First-match-wins** — explicit `false` on an earlier role stops the chain
- **Anonymous users** — automatic `anonymous` role for null/unauthenticated users
- **`checkAll` / `checkAny`** — multi-action checks directly on the instance
- **Pre-bound guards** — `permit.for(user)` returns a `PermitGuard` with `can`, `canAny`, `canAll`
- **Fluent API** — all write methods return the permit instance for chaining
- **Snapshot / restore** — export and re-import permissions **and** hierarchy as a plain object
- **TypeScript generics** — type user shape, action strings, and context data with `createPermit<User, Action, Data>()`
- **Strict mode** — `opts.strict: true` turns configuration mistakes into thrown errors
- **Zero dependencies** — <PackageInfo package="permit" type="size" /> gzipped, <PackageInfo package="permit" type="dependencies" /> dependencies

## Next Steps

|                           |                                                                |
| ------------------------- | -------------------------------------------------------------- |
| [Usage Guide](./usage.md) | Role setup, inheritance, wildcards, dynamic rules, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation              |
| [Examples](./examples.md) | Real-world RBAC patterns and framework integrations            |
