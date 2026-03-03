---
title: Permit — Usage Guide
description: Role setup, wildcard permissions, dynamic rules, and testing patterns for Permit.
---

# Permit Usage Guide

::: tip New to Permit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

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
permit.set('admin', '*', { update: true });
permit.set('editor', 'posts', { update: (user, data) => user.id === data?.authorId });

permit.check(user, 'posts', 'update', post);
```

| Feature | Permit | CASL | AccessControl |
|---|---|---|---|
| Bundle size | <PackageInfo package="permit" type="size" /> | ~10 kB | ~5 kB |
| Dynamic rules | ✅ Functions | ✅ | ❌ |
| Wildcard roles | ✅ | ✅ | ✅ |
| Anonymous users | ✅ Built-in | Manual | Manual |
| TypeScript | ✅ Generics | ✅ | ⚠️ |
| Zero dependencies | ✅ | ❌ | ❌ |

**Use Permit when** you need a lightweight, typesafe RBAC for moderate complexity (role/resource/action) without Mongoose or event-based architectures.

**Consider alternatives when** you need attribute-based access control (ABAC), complex policy inheritance chains, or audit logging built in.

## Basic Setup

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();
```

`createPermit()` returns a `Permit` instance. Create one per app or feature area.

## Registering Permissions with `set()`

```ts
// permit.set(role, resource, actions, replace?)
permit.set('admin', 'posts', { create: true, read: true, update: true, delete: true });
permit.set('editor', 'posts', { read: true, create: true });
permit.set('viewer', 'posts', { read: true });
```

The four available actions are `create`, `read`, `update`, `delete`.

### Dynamic (function-based) permissions

Pass a function that receives `(user, data)` for context-aware rules:

```ts
permit.set('editor', 'posts', {
  update: (user, data) => user.id === data?.authorId,
  delete: (user, data) => user.id === data?.authorId,
});
```

### Merge vs Replace

By default, `set()` **merges** actions into any existing permissions for that role/resource:

```ts
permit.set('editor', 'posts', { read: true });
permit.set('editor', 'posts', { create: true }); // now has read + create

// Pass replace=true to overwrite
permit.set('editor', 'posts', { delete: true }, true); // only has delete now
```

## Wildcards

Use `'*'` as the **resource** to apply permissions across all resources for a role:

```ts
import { WILDCARD } from '@vielzeug/permit';

permit.set('admin', WILDCARD, { create: true, read: true, update: true, delete: true });
// admin can do anything on any resource
```

Use `'*'` as the **role** to apply permissions to all users regardless of their roles:

```ts
permit.set(WILDCARD, 'announcements', { read: true });
// every user can read announcements
```

### Resource precedence

When both a specific resource and `'*'` are registered for the same role, the **specific resource takes priority**:

```ts
permit.set('admin', WILDCARD, { read: true });
permit.set('admin', 'secrets', { read: false }); // overrides wildcard

const admin = { id: '1', roles: ['admin'] };
permit.check(admin, 'posts', 'read');   // true (wildcard)
permit.check(admin, 'secrets', 'read'); // false (specific override)
```

## Anonymous Users

Users without a valid `id` (falsy) or where `roles` is not an array automatically receive the `anonymous` role. They also receive the `WILDCARD` role, meaning they inherit any wildcard-role permissions too:

```ts
import { ANONYMOUS } from '@vielzeug/permit';

permit.set(ANONYMOUS, 'posts', { read: true }); // unauthenticated users can read

const guest = { id: '', roles: [] }; // falsy id → anonymous
permit.check(guest, 'posts', 'read');   // true
permit.check(guest, 'posts', 'create'); // false
```

::: warning
Anonymous users inherit wildcard role permissions. Ensure anything registered under the `WILDCARD` role is intentionally public.
:::

## Checking Permissions

```ts
const user = { id: 'u1', roles: ['editor'] };

// Check a specific action
permit.check(user, 'posts', 'read');
permit.check(user, 'posts', 'update', postData); // data passed to function permissions

// Check role membership
permit.hasRole(user, 'editor'); // true
permit.hasRole(user, 'admin');  // false
```

## TypeScript Generics

Type your user and data shapes to get type-safe permission functions:

```ts
import { createPermit, type BaseUser } from '@vielzeug/permit';

type User = BaseUser & { id: string; roles: string[]; department: string };
type Post = { authorId: string; departmentId: string };

const permit = createPermit<User, Post>();

permit.set('manager', 'posts', {
  update: (user, post) => user.department === post?.departmentId,
});

// TypeScript infers user: User, post: Post | undefined
```

## Removing Permissions

```ts
// Remove all actions for a role/resource
permit.remove('editor', 'posts');

// Remove a specific action
permit.remove('editor', 'posts', 'delete');
```

## Inspecting & Clearing

```ts
// Get a deep copy of all registered permissions
const allRoles = permit.roles;

// Clear everything
permit.clear();
```

## Testing

```ts
import { createPermit } from '@vielzeug/permit';

describe('Post permissions', () => {
  const permit = createPermit();

  beforeEach(() => {
    permit.clear();
    permit.set('admin', '*', { create: true, read: true, update: true, delete: true });
    permit.set('editor', 'posts', {
      read: true,
      update: (user, data) => user.id === data?.authorId,
    });
  });

  it('admin can do everything', () => {
    const admin = { id: 'a1', roles: ['admin'] };
    expect(permit.check(admin, 'posts', 'delete')).toBe(true);
    expect(permit.check(admin, 'comments', 'read')).toBe(true);
  });

  it('editor can update own posts only', () => {
    const editor = { id: 'u1', roles: ['editor'] };
    expect(permit.check(editor, 'posts', 'update', { authorId: 'u1' })).toBe(true);
    expect(permit.check(editor, 'posts', 'update', { authorId: 'u2' })).toBe(false);
  });

  it('rejects unknown action', () => {
    const user = { id: 'u1', roles: ['viewer'] };
    expect(permit.check(user, 'posts', 'delete')).toBe(false);
  });
});
```
