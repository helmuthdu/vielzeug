---
title: Permit — Usage Guide
description: Role setup, inheritance, wildcard permissions, dynamic rules, and practical checks for Permit.
---

# Permit Usage Guide

::: tip New to Permit?
Start with the [Overview](./index.md), then use this page for implementation-level behavior.
:::

[[toc]]

## Basic Setup

```ts
const permit = createPermit();
```

You can seed state at construction:

```ts
const permit = createPermit({
  initial: {
    hierarchy: { editor: ['viewer'] },
    permissions: {
      editor: { posts: { write: true } },
      viewer: { posts: { read: true } },
    },
  },
});
```

## Registering Permissions with define()

Use `define(role, resource, actions)` to add or merge permissions.

```ts
permit.define('editor', 'posts', {
  read: true,
  write: (user, data) => user.id === data?.authorId,
});

permit.define('editor', 'posts', { delete: false }); // merges into same role/resource
```

Shorthands:

```ts
permit.grant('viewer', 'posts', 'read');
permit.deny('blocked', 'posts', 'read');
```

Notes:

- Role/resource/action names are normalized (trim + lowercase).
- Empty `actions` map is ignored unless `strict: true`, where it throws.
- All write methods are fluent and return `permit`.

## Wildcards

Use `WILDCARD` (`'*'`) for role, resource, or action.

```ts
permit.grant(WILDCARD, 'status', 'read'); // every user role
permit.grant('admin', WILDCARD, 'read', 'write'); // every resource
permit.define('superadmin', 'posts', { [WILDCARD]: true }); // every action on posts
```

Resource precedence behavior:

```ts
permit.define('admin', WILDCARD, { read: true, delete: true });
permit.define('admin', 'posts', { write: true, read: false });

permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read'); // false (specific wins)
permit.check({ id: '1', roles: ['admin'] }, 'posts', 'delete'); // true (fallback)
```

Set `wildcardFallback: false` in `createPermit()` to disable wildcard-resource fallback once a specific resource entry exists.

## Role Inheritance

```ts
permit.grant('viewer', WILDCARD, 'read');
permit.extend('editor', 'viewer');
permit.extend('admin', 'editor');
```

Resolution uses breadth-first traversal across role parents.

Remove inheritance:

```ts
permit.unextend('admin', 'editor'); // remove one parent
permit.unextend('editor'); // remove all parents for editor
```

## Anonymous Users

Users are treated as anonymous when null, missing `id`, or missing `roles` array.

```ts
permit.grant(ANONYMOUS, 'posts', 'read');

permit.check(null, 'posts', 'read'); // true
isAnonymous(null); // true
hasRole(null, ANONYMOUS); // true
```

A user with valid `id` and `roles: []` is authenticated (not anonymous).

## Checking Permissions

```ts
const user = { id: 'u1', roles: ['editor'] };

permit.check(user, 'posts', 'read');
permit.check(user, 'posts', 'write', { authorId: 'u1' });

permit.checkAll(user, 'posts', ['read', 'write'], { authorId: 'u1' });
permit.checkAny(user, 'posts', ['write', 'delete']);
```

First role with an explicit opinion wins (`true` or `false`).

## Guard API

Use `permit.for(user)` to bind checks to one user.

```ts
const guard = permit.for(user);

guard.can('posts', 'read');
guard.canAll('posts', ['read', 'write'], { authorId: 'u1' });
guard.canAny('posts', ['write', 'delete']);
```

The guard is live and reflects later permission changes.

## Removing and Resetting State

```ts
permit.remove('editor', 'posts', 'write'); // one action
permit.remove('editor', 'posts'); // one resource
permit.remove('editor'); // full role

const state = permit.snapshot();
permit.clear();
permit.restore(state);
```

`snapshot()` / `restore()` include both permissions and hierarchy.

## Best Practices

- Define one centralized Permit instance per bounded context.
- Use `scope`-like naming conventions in resources (`billing.invoice`, `posts.comment`).
- Prefer `guard` objects (`permit.for(user)`) for repeated checks.
- Reserve wildcards for explicit platform-level roles.
- Use `strict: true` in tests/CI to catch misconfigured `define()` calls early.
