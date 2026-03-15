---
title: Permit — Usage Guide
description: Role setup, inheritance, wildcard permissions, dynamic rules, and testing patterns for Permit.
---

## Permit Usage Guide

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

| Feature           | Permit                                       | CASL   | AccessControl |
| ----------------- | -------------------------------------------- | ------ | ------------- |
| Bundle size       | <PackageInfo package="permit" type="size" /> | ~10 kB | ~5 kB         |
| Dynamic rules     | ✅ Functions                                 | ✅     | ❌            |
| Role inheritance  | ✅ Built-in                                  | Manual | ✅            |
| Wildcard roles    | ✅                                           | ✅     | ✅            |
| Anonymous users   | ✅ Built-in                                  | Manual | Manual        |
| TypeScript        | ✅ Generics                                  | ✅     | ⚠️            |
| Zero dependencies | ✅                                           | ❌     | ❌            |

**Use Permit when** you need a lightweight, typesafe RBAC for moderate complexity (role/resource/action) without Mongoose or event-based architectures.

**Consider alternatives when** you need attribute-based access control (ABAC), complex policy inheritance chains, or audit logging built in.

## Import

```ts
import { createPermit } from '@vielzeug/permit';

// Utility functions
import { hasRole, isAnonymous } from '@vielzeug/permit';

// Constants
import { WILDCARD, ANONYMOUS } from '@vielzeug/permit';

// Types only
import type {
  Permit,
  PermitGuard,
  PermitState,
  BaseUser,
  PermissionCheck,
  PermissionActions,
  PermitOptions,
} from '@vielzeug/permit';
```

## Basic Setup

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();
```

`createPermit()` returns a `Permit` instance. Create one per app or feature area.

You can seed permissions and hierarchy at construction time using the `initial` option:

```ts
const permit = createPermit({
  initial: {
    permissions: {
      admin: { posts: { read: true, write: true, delete: true } },
      editor: { posts: { read: true, write: true } },
      viewer: { posts: { read: true } },
    },
    hierarchy: {
      admin: ['editor'], // admin inherits editor
      editor: ['viewer'], // editor inherits viewer
    },
  },
});
```

## Defining Permissions with `define()`

```ts
// permit.define(role, resource, actions)
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

`define()` **always merges** actions into any existing permissions for that role/resource:

```ts
permit.define('editor', 'posts', { read: true });
permit.define('editor', 'posts', { write: true }); // now has read + write
```

To replace instead of merge, remove first then re-define:

```ts
permit.remove('editor', 'posts').define('editor', 'posts', { delete: true }); // only delete
```

### Dynamic (function-based) permissions

Pass a function that receives `(user, data)` for context-aware rules:

```ts
permit.define('editor', 'posts', {
  update: (user, data) => user.id === data?.authorId,
  delete: (user, data) => user.id === data?.authorId,
});
```

### Fluent chaining

`define()` — like all write methods — returns the permit instance so you can chain setup:

```ts
const permit = createPermit()
  .grant('admin', '*', 'read', 'write', 'delete')
  .define('editor', 'posts', { read: true, write: (u, d) => u.id === d?.authorId })
  .grant('viewer', '*', 'read');
```

## Grant and Deny Shorthands

For boolean permissions, `grant()` and `deny()` are shorter than writing action objects:

```ts
import { WILDCARD } from '@vielzeug/permit';

// Instead of: permit.define('admin', WILDCARD, { read: true, write: true, delete: true })
permit.grant('admin', WILDCARD, 'read', 'write', 'delete');

// Instead of: permit.define('blocked', 'posts', { read: false })
permit.deny('blocked', 'posts', 'read');
```

Both accept any number of actions via rest params, return the permit for chaining, and merge with any existing `define()` entries.

## Role Inheritance

Use `extend(childRole, parentRole)` to declare that a child role inherits all permissions of a parent:

```ts
permit.grant('viewer', '*', 'read');
permit.extend('editor', 'viewer'); // editor gets viewer's read on everything
permit.extend('admin', 'editor'); // admin gets editor's permissions too

// Admin now has all viewer + editor permissions
const admin = { id: '1', roles: ['admin'] };
permit.check(admin, 'posts', 'read'); // true — inherited through admin → editor → viewer
```

**Precedence**: a role's own permissions always win over inherited ones.

```ts
permit.grant('editor', 'posts', 'read', 'write');
permit.deny('admin', 'posts', 'write'); // admin explicitly denies write
permit.extend('admin', 'editor');

const admin = { id: '1', roles: ['admin'] };
permit.check(admin, 'posts', 'read'); // true  — inherited from editor
permit.check(admin, 'posts', 'write'); // false — own deny wins over inherited grant
```

### Multi-level inheritance

`extend()` supports any depth. Resolution uses BFS so the closest ancestor wins:

```ts
permit.grant('viewer', 'posts', 'read');
permit.grant('commenter', 'posts', 'comment');
permit.extend('editor', 'viewer');
permit.extend('editor', 'commenter'); // multiple parents
permit.extend('admin', 'editor');

// admin inherits all of viewer + commenter + editor
```

### Removing inheritance with `unextend()`

```ts
permit.unextend('admin', 'editor'); // remove one parent
permit.unextend('admin'); // remove all parents for admin
```

## Wildcards

### Wildcard resource

Use `'*'` as the **resource** to apply permissions across all resources for a role:

```ts
import { WILDCARD } from '@vielzeug/permit';

permit.grant('admin', WILDCARD, 'read', 'write', 'delete');
// admin can do read/write/delete on any resource
```

### Wildcard role

Use `'*'` as the **role** to apply permissions to every user regardless of their roles:

```ts
permit.grant(WILDCARD, 'announcements', 'read');
// every user (including anonymous) can read announcements
```

### Wildcard action

Use `'*'` as an **action key** to match any action on a resource:

```ts
permit.define('superadmin', 'posts', { [WILDCARD]: true });
// superadmin can perform any action on posts
permit.check({ id: '1', roles: ['superadmin'] }, 'posts', 'anything'); // true
```

Specific action entries take precedence over the wildcard action:

```ts
permit.define('superadmin', 'posts', { [WILDCARD]: true, delete: false });
permit.check({ id: '1', roles: ['superadmin'] }, 'posts', 'read'); // true  (wildcard action)
permit.check({ id: '1', roles: ['superadmin'] }, 'posts', 'delete'); // false (specific deny wins)
```

### Resource precedence and partial overrides

When both a specific resource and `'*'` are defined for the same role, the **specific resource takes priority for shared actions** and the **wildcard fills in any actions not defined on the specific resource**:

```ts
permit.define('admin', WILDCARD, { read: true, delete: true });
permit.define('admin', 'posts', { write: true, read: false }); // partial override

const admin = { id: '1', roles: ['admin'] };
permit.check(admin, 'posts', 'read'); // false — specific resource overrides wildcard
permit.check(admin, 'posts', 'write'); // true  — defined on specific resource
permit.check(admin, 'posts', 'delete'); // true  — falls back to wildcard
```

To disable this fallback behaviour, set `wildcardFallback: false`:

```ts
const permit = createPermit({ wildcardFallback: false });
// Registering a specific resource now fully isolates it from the wildcard resource
```

## Anonymous Users

Users with a falsy `id` or where `roles` is not an array automatically receive the `anonymous` role:

```ts
import { ANONYMOUS } from '@vielzeug/permit';

permit.grant(ANONYMOUS, 'posts', 'read'); // unauthenticated users can read

permit.check(null, 'posts', 'read'); // true
permit.check({ id: '', roles: [] }, 'posts', 'read'); // true (falsy id → anonymous)
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

### Multi-action checks

Check multiple actions without creating a guard:

```ts
// True only if every action passes
permit.checkAll(user, 'posts', ['read', 'write']);
permit.checkAll(user, 'posts', ['read', 'write'], postData); // with context data

// True if at least one action passes
permit.checkAny(user, 'posts', ['write', 'delete']);
```

### Multi-role resolution

When a user has multiple roles, **the first role that has an explicit opinion wins**. A role "has an opinion" when it has the action defined (even as `false`):

```ts
permit.define('blocked', 'posts', { read: false });
permit.define('admin', 'posts', { read: true });

// blocked is first — its explicit false wins despite admin allowing it
permit.check({ id: '1', roles: ['blocked', 'admin'] }, 'posts', 'read'); // false

// admin is first — its true wins
permit.check({ id: '1', roles: ['admin', 'blocked'] }, 'posts', 'read'); // true
```

### Pre-bound guards with `for()`

When making multiple checks for the same user, use `permit.for(user)` to get a `PermitGuard` with three methods:

```ts
const guard = permit.for(user);

guard.can('posts', 'read'); // single action
guard.can('posts', 'write', { authorId: 'u1' }); // with data
guard.canAll('posts', ['read', 'write']); // true only if ALL pass
guard.canAny('posts', ['write', 'delete']); // true if ANY passes
```

The guard is **live** — it reflects any permissions added after it was created.

## Removing Permissions

```ts
// Remove a specific action
permit.remove('editor', 'posts', 'delete');

// Remove all actions for a resource
permit.remove('editor', 'posts');

// Remove entire role
permit.remove('editor');
```

`remove()` returns the permit for chaining and is a no-op when the role, resource, or action does not exist.

## Utility Functions

```ts
import { hasRole, isAnonymous } from '@vielzeug/permit';

const user = { id: 'u1', roles: ['Admin', 'Editor'] };

hasRole(user, 'admin'); // true (case-insensitive)
hasRole(user, 'viewer'); // false

isAnonymous(user); // false
isAnonymous(null); // true
```

## Snapshot / Restore

`snapshot()` returns a `PermitState` — a deep copy of **both** the permission map and the role inheritance hierarchy. Mutations to the snapshot do not affect internal state.

```ts
// Capture full state
const state = permit.snapshot();
// state.permissions['admin']['posts'] → { read: true, write: true }
// state.hierarchy?.admin              → ['editor']

// Restore from state (replaces permissions and hierarchy)
permit.restore(state);

// Clear everything — permissions and hierarchy
permit.clear();
```

::: warning
Dynamic (function) permissions are **not JSON-serializable**. `snapshot()` / `restore()` are safe for in-memory transfer (e.g. testing, tenant switching) only. Do not `JSON.stringify` a snapshot that contains function permissions.
:::

## TypeScript Generics

Type your user shape to get type-safe permission functions:

```ts
import { createPermit, type BaseUser } from '@vielzeug/permit';

type User = BaseUser & { department: string };

const permit = createPermit<User>();

permit.define('manager', 'projects', {
  update: (user, data) => user.department === data?.departmentId,
  //        ^^^^ TypeScript infers user: User
});
```

Custom action strings are typed via the second generic:

```ts
type CmsAction = 'read' | 'write' | 'publish' | 'archive';

const permit = createPermit<User, CmsAction>();
// permit.define / permit.check only accept CmsAction strings
```

Context data is typed via the third generic:

```ts
type PostData = { authorId: string; tenantId: string };

const permit = createPermit<User, CmsAction, PostData>();

permit.define('editor', 'posts', {
  update: (user, data) => user.id === data?.authorId,
  //                                        ^^^^^^^^ TypeScript infers data: PostData | undefined
});
```

## Strict Mode

When `strict: true`, calling `define()` with an empty actions map throws an error instead of silently doing nothing:

```ts
const permit = createPermit({ strict: true });
permit.define('admin', 'posts', {}); // throws: "[permit] define('admin', 'posts', {}) has no actions"
```

This is useful during development to catch typos or wiring mistakes early.

## Audit Logging

Pass a `logger` to `createPermit()` to be notified on every check:

```ts
const permit = createPermit({
  logger: (result, user, resource, action, data) => {
    auditLog.write({
      type: result, // 'allow' | 'deny'
      userId: user?.id,
      resource,
      action,
      data,
      ts: Date.now(),
    });
  },
});
```

## Best Practices

### 1. Define permissions centrally

Use a single file or module for all role definitions. Avoid spreading `permit.grant()` calls across your codebase.

### 2. Use TypeScript generics for type-safe action strings

```ts
type Action = 'read' | 'write' | 'delete';
const permit = createPermit<BaseUser, Action>();

permit.check(user, 'posts', 'publish'); // TS error — 'publish' not in Action
```

### 3. Prefer `extend()` over duplicating grants

```ts
// ✅
permit.grant('viewer', '*', 'read');
permit.extend('editor', 'viewer');
permit.extend('admin', 'editor');
permit.grant('admin', '*', 'delete');

// ❌ brittle — viewer changes won't propagate
permit.grant('viewer', '*', 'read');
permit.grant('editor', '*', 'read', 'write');
permit.grant('admin', '*', 'read', 'write', 'delete');
```

### 4. Use `for()` when checking multiple actions for the same user

```ts
const guard = permit.for(user);
if (guard.can('posts', 'write')) {
  /* ... */
}
if (guard.canAll('posts', ['read', 'write'])) {
  /* ... */
}
```

### 5. Isolate tests with `createPermit()`

```ts
describe('Post permissions', () => {
  let permit: Permit;

  beforeEach(() => {
    // Fresh instance per test — no shared state
    permit = createPermit();
    permit.grant('admin', '*', 'read', 'write', 'delete').define('editor', 'posts', {
      read: true,
      write: (u, d) => u.id === d?.authorId,
    });
  });

  it('editor can write own posts only', () => {
    const editor = { id: 'u1', roles: ['editor'] };
    expect(permit.check(editor, 'posts', 'write', { authorId: 'u1' })).toBe(true);
    expect(permit.check(editor, 'posts', 'write', { authorId: 'u2' })).toBe(false);
  });

  it('admin can delete any post', () => {
    const admin = { id: 'u2', roles: ['admin'] };
    expect(permit.check(admin, 'posts', 'delete')).toBe(true);
  });
});
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> – Complete API documentation</li>
      <li><a href="./examples">Examples</a> – Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> – Try it in your browser</li>
    </ul>
  </div>
</div>
