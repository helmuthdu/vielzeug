---
title: Permit — Role-based access control for TypeScript
description: Type-safe RBAC with role inheritance, wildcards, dynamic checks, and anonymous-user support.
---

<PackageBadges package="permit" />

<img src="/logo-permit.svg" alt="Permit logo" width="156" class="logo-highlight"/>

# Permit

`@vielzeug/permit` is a lightweight role-based access control (RBAC) engine for role/resource/action authorization checks in TypeScript.

<!-- Search keywords: role-based access control, RBAC, permission policy engine, authorization rules. -->

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
import { ANONYMOUS, WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit
  .grant('viewer', WILDCARD, 'read')
  .extend('editor', 'viewer')
  .define('editor', 'posts', {
    write: (user, data) => user.id === data?.authorId,
  })
  .extend('admin', 'editor')
  .grant('admin', WILDCARD, 'delete')
  .grant(ANONYMOUS, 'posts', 'read');

const user = { id: 'u1', roles: ['editor'] };

permit.check(user, 'posts', 'read');
permit.check(user, 'posts', 'write', { authorId: 'u1' });
permit.checkAny(user, 'posts', ['write', 'delete']);
```

## Why Permit?

Hand-rolling RBAC logic leads to scattered `if` checks and duplicated role logic across your codebase:

```ts
// Before — scattered manual checks
function canEdit(user, post) {
  if (user.roles.includes('admin')) return true;
  if (user.roles.includes('editor') && post.authorId === user.id) return true;
  return false;
}

// After — centralized with Permit
import { createPermit } from '@vielzeug/permit';
const permit = createPermit();
permit.define('admin', '*', { update: true });
permit.define('editor', 'posts', { update: (user, data) => user.id === data?.authorId });

permit.check(user, 'posts', 'update', post);
```

| Feature           | Permit                                       | CASL   | AccessControl |
| ----------------- | -------------------------------------------- | ------ | ------------- |
| Bundle size       | <PackageInfo package="permit" type="size" /> | ~10 kB | ~10 kB        |
| Dynamic rules     | ✅ Functions                                 | ✅     | ❌            |
| Role inheritance  | ✅ Built-in                                  | Manual | ✅            |
| Wildcard roles    | ✅                                           | ✅     | ✅            |
| Anonymous users   | ✅ Built-in                                  | Manual | Manual        |
| TypeScript        | ✅ Generics                                  | ✅     | ⚠️            |
| Zero dependencies | ✅                                           | ❌     | ❌            |

**Use Permit when** you need a lightweight, typesafe RBAC for moderate complexity (role/resource/action) without Mongoose or event-based architectures.

**Consider alternatives when** you need attribute-based access control (ABAC), complex policy inheritance chains, or audit logging built in.

## Features

- Role/resource/action permission checks
- Dynamic permission functions `(user, data?) => boolean`
- Role inheritance and parent unbinding (`extend`, `unextend`)
- Wildcard role/resource/action support (`WILDCARD`)
- Anonymous-role support (`ANONYMOUS`)
- Bulk checks (`checkAll`, `checkAny`) and user-bound guards (`for(user)`)
- Permission state lifecycle (`remove`, `snapshot`, `restore`, `clear`)
- Strict-mode and wildcard-fallback options
- Zero dependencies — <PackageInfo package="permit" type="size" /> gzipped

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Routeit](/routeit/)
- [Wireit](/wireit/)
- [Stateit](/stateit/)
