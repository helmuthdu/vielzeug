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
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();

// Register role permissions
permit.set('admin', '*', { create: true, read: true, update: true, delete: true });
permit.set('editor', 'posts', { read: true, update: (user, data) => user.id === data?.authorId });
permit.set('viewer', 'posts', { read: true });

// Check permissions
const user = { id: 'u1', roles: ['editor'] };

permit.check(user, 'posts', 'read');           // true
permit.check(user, 'posts', 'update', post);   // true if user.id === post.authorId
permit.check(user, 'posts', 'delete');         // false

// Check if user has a role
permit.hasRole(user, 'editor'); // true
```

## Features

- **Role-based rules** — map roles to resources and actions (`create`, `read`, `update`, `delete`)
- **Dynamic permissions** — use functions `(user, data) => boolean` for context-aware rules
- **Wildcard resource** — `'*'` grants permissions across all resources for a role
- **Anonymous users** — automatic `anonymous` role for unauthenticated users
- **TypeScript generics** — type your user and data shapes with `createPermit<User, Data>()`
- **Zero dependencies** — <PackageInfo package="permit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Role setup, wildcards, dynamic rules, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world RBAC patterns and framework integrations |
