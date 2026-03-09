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
permit.define('admin', '*', { update: true });
permit.define('editor', 'posts', { update: (user, data) => user.id === data?.authorId });

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

You can also seed permissions at construction time:

```ts
const permit = createPermit({
  roles: {
    admin:  { posts: { read: true, write: true, delete: true } },
    editor: { posts: { read: true, write: true } },
    viewer: { posts: { read: true } },
  },
});
```

## Registering Permissions with `define()`

```ts
// permit.define(role, resource, actions, opts?)
permit.define('admin', 'posts', { read: true, write: true, delete: true });
permit.define('editor', 'posts', { read: true, write: true });
permit.define('viewer', 'posts', { read: true });
```

Actions are **any string** — you are not limited to CRUD:

```ts
permit.define('editor', 'articles', {
  read: true,
  publish: true,
  'request-review': true,
  archive: false,
});
```

### Dynamic (function-based) permissions

Pass a function that receives `(user, data)` for context-aware rules:

```ts
permit.define('editor', 'posts', {
  update: (user, data) => user.id === data?.authorId,
  delete: (user, data) => user.id === data?.authorId,
});
```

### Merge vs Replace

By default, `define()` **merges** actions into any existing permissions for that role/resource:

```ts
permit.define('editor', 'posts', { read: true });
permit.define('editor', 'posts', { write: true }); // now has read + write

// Pass { replace: true } to overwrite instead of merging
permit.define('editor', 'posts', { delete: true }, { replace: true }); // only has delete now
```

### Fluent chaining

`define()` returns the permit instance so you can chain setup:

```ts
const permit = createPermit()
  .define('admin', '*', { read: true, write: true, delete: true })
  .define('editor', 'posts', { read: true, write: true })
  .define('viewer', '*', { read: true });
```

## Wildcards

Use `'*'` as the **resource** to apply permissions across all resources for a role:

```ts
import { WILDCARD } from '@vielzeug/permit';

permit.define('admin', WILDCARD, { read: true, write: true, delete: true });
// admin can do anything on any resource
```

Use `'*'` as the **role** to apply permissions to all users regardless of their roles:

```ts
permit.define(WILDCARD, 'announcements', { read: true });
// every user can read announcements
```

### Resource precedence and partial overrides

When both a specific resource and `'*'` are registered for the same role, the **specific resource takes priority for shared actions**, and the **wildcard fills in any actions not defined on the specific resource**:

```ts
permit.define('admin', WILDCARD, { read: true, delete: true });
permit.define('admin', 'posts', { write: true, read: false }); // partial override

const admin = { id: '1', roles: ['admin'] };
permit.check(admin, 'posts', 'read');   // false — specific resource overrides wildcard
permit.check(admin, 'posts', 'write');  // true  — defined on specific resource
permit.check(admin, 'posts', 'delete'); // true  — falls back to wildcard
```

## Anonymous Users

Users with a falsy `id` or where `roles` is not an array automatically receive the `anonymous` role:

```ts
import { ANONYMOUS } from '@vielzeug/permit';

permit.define(ANONYMOUS, 'posts', { read: true }); // unauthenticated users can read

permit.check(null, 'posts', 'read');   // true
permit.check({ id: '', roles: [] }, 'posts', 'read');   // true (falsy id → anonymous)
permit.check({ id: '1', roles: [] }, 'posts', 'read'); // false (authenticated, no role)
```

::: warning
Users with a valid `id` and an empty `roles` array are treated as **authenticated** — they will not receive the `anonymous` role.
:::

## Checking Permissions

```ts
const user = { id: 'u1', roles: ['editor'] };

// Single check
permit.check(user, 'posts', 'read');
permit.check(user, 'posts', 'update', postData); // data passed to function permissions
```

### Multi-role resolution

When a user has multiple roles, **the first role that has an explicit opinion wins**. A role "has an opinion" when it has the action defined (even as `false`):

```ts
permit.define('blocked', 'posts', { read: false });
permit.define('admin',   'posts', { read: true });

// blocked is first — its explicit false wins despite admin allowing it
permit.check({ id: '1', roles: ['blocked', 'admin'] }, 'posts', 'read'); // false

// admin is first — its true wins
permit.check({ id: '1', roles: ['admin', 'blocked'] }, 'posts', 'read'); // true
```

### Pre-bound guards with `for()`

When making multiple checks for the same user, use `permit.for(user)` to avoid repeating the user argument:

```ts
const can = permit.for(user);

can('posts', 'read');                       // true
can('posts', 'write', { authorId: 'u1' }); // true
can('posts', 'delete');                    // false
```

The guard is live — it reflects any permissions added after it was created.

## Utility Functions

```ts
import { hasRole, isAnonymous } from '@vielzeug/permit';

const user = { id: 'u1', roles: ['Admin', 'Editor'] };

hasRole(user, 'admin');  // true (case-insensitive)
hasRole(user, 'viewer'); // false

isAnonymous(user);  // false
isAnonymous(null);  // true
```

## TypeScript Generics

Type your user shape to get type-safe permission functions:

```ts
import { createPermit, type BaseUser } from '@vielzeug/permit';

type User = BaseUser & { department: string };

const permit = createPermit<User>();

permit.define('manager', 'projects', {
  update: (user, data) => user.department === data?.departmentId,
});

// TypeScript infers user: User in the callback
```

Custom action strings are also typed via the second generic:

```ts
type CmsAction = 'read' | 'write' | 'publish' | 'archive';

const permit = createPermit<User, CmsAction>();
// permit.define / permit.check now only accept CmsAction strings
```

## Removing Permissions

```ts
// Remove a specific action
permit.remove('editor', 'posts', 'delete');

// Remove all actions for a resource
permit.remove('editor', 'posts');

// Remove entire role
permit.remove('editor');
```

## Inspecting & Clearing

```ts
// Get a plain-object snapshot (safe copy — mutations don't affect internal state)
const snap = permit.snapshot();
console.log(snap.admin.posts); // { read: true, write: true }

// Clear everything
permit.clear();
```

## Audit Logging

Pass a `logger` to `createPermit()` to be notified on every check:

```ts
const permit = createPermit({
  logger: (result, user, resource, action) => {
    console.log(`[${result.toUpperCase()}] ${user.id} → ${resource}:${action}`);
  },
});
```

## Testing

```ts
import { createPermit } from '@vielzeug/permit';

describe('Post permissions', () => {
  const permit = createPermit();

  beforeEach(() => {
    permit.clear();
    permit
      .define('admin', '*', { read: true, write: true, delete: true })
      .define('editor', 'posts', {
        read: true,
        write: (user, data) => user.id === data?.authorId,
      });
  });

  it('admin can do everything', () => {
    const admin = { id: 'a1', roles: ['admin'] };
    expect(permit.check(admin, 'posts', 'delete')).toBe(true);
    expect(permit.check(admin, 'comments', 'read')).toBe(true);
  });

  it('editor can write own posts only', () => {
    const editor = { id: 'u1', roles: ['editor'] };
    expect(permit.check(editor, 'posts', 'write', { authorId: 'u1' })).toBe(true);
    expect(permit.check(editor, 'posts', 'write', { authorId: 'u2' })).toBe(false);
  });

  it('rejects unknown action', () => {
    const user = { id: 'u1', roles: ['viewer'] };
    expect(permit.check(user, 'posts', 'delete')).toBe(false);
  });
});
```
