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
import { createPermit, hasRole } from '@vielzeug/permit';

const permit = createPermit();

// Define role permissions (any string actions, not just CRUD)
permit
  .define('admin', '*', { read: true, write: true, delete: true })
  .define('editor', 'posts', { read: true, write: (user, data) => user.id === data?.authorId })
  .define('viewer', 'posts', { read: true });

// Check permissions
const user = { id: 'u1', roles: ['editor'] };

permit.check(user, 'posts', 'read');                          // true
permit.check(user, 'posts', 'write', { authorId: 'u1' });    // true
permit.check(user, 'posts', 'delete');                        // false

// Pre-bind a guard for a single user
const can = permit.for(user);
can('posts', 'read');                       // true
can('posts', 'write', { authorId: 'u1' }); // true

// Check role membership (standalone utility)
hasRole(user, 'editor'); // true
```

## Features

- **Role-based rules** — map roles to resources and any string actions
- **Dynamic permissions** — use functions `(user, data) => boolean` for context-aware rules
- **Wildcard role/resource** — `'*'` applies to all users or all resources
- **Anonymous users** — automatic `anonymous` role for unauthenticated users
- **Pre-bound guards** — `permit.for(user)` returns a single-user check function
- **Fluent API** — `define()` chains return the permit instance
- **Immutable snapshot** — `snapshot()` returns a safe plain-object copy
- **TypeScript generics** — type your user shape with `createPermit<MyUser>()`
- **Zero dependencies** — <PackageInfo package="permit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Role setup, wildcards, dynamic rules, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world RBAC patterns and framework integrations |
