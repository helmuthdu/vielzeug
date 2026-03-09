---
title: Permit — API Reference
description: Complete API reference for Permit with type signatures and parameter documentation.
---

# Permit API Reference

[[toc]]

## `createPermit(opts?)`

Factory function that creates a new `Permit` instance.

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();              // defaults: BaseUser, string actions
const typed  = createPermit<MyUser>();      // typed user
const strict = createPermit<MyUser, 'read' | 'write' | 'delete'>(); // typed actions
```

| Parameter | Type | Description |
|---|---|---|
| `opts.logger` | `(result, user, resource, action) => void` | Called on every `check()`. Useful for auditing. |
| `opts.roles` | `Record<string, Record<string, PermissionActions>>` | Initial permissions seeded at creation time. |

**Returns:** `Permit<TUser, TAction>`



## `Permit<TUser, TAction>`

### `permit.define(role, resource, actions, opts?)`

Register or update permissions for a role/resource pair. Returns the permit instance for fluent chaining.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `role` | `string` | — | Role name. Case-insensitive, whitespace-trimmed. |
| `resource` | `string` | — | Resource name, or `'*'` to match all resources. |
| `actions` | `PermissionActions<TAction, TUser>` | — | Map of action → `boolean` or `(user, data?) => boolean`. |
| `opts.replace` | `boolean` | `false` | Replace existing actions instead of merging. |

```ts
// Merge (default)
permit.define('editor', 'posts', { read: true });
permit.define('editor', 'posts', { write: true }); // now has read + write

// Replace
permit.define('editor', 'posts', { delete: true }, { replace: true }); // only delete

// Fluent chaining
permit
  .define('admin', '*', { read: true, write: true, delete: true })
  .define('viewer', '*', { read: true });
```

**Throws:** `Error('Role is required')` / `Error('Resource is required')` when either is empty.

---

### `permit.check(user, resource, action, data?)`

Check if a user has permission to perform an action on a resource.

| Parameter | Type | Description |
|---|---|---|
| `user` | `TUser` | User object with `id` and `roles`. |
| `resource` | `string` | Resource name. Case-insensitive. |
| `action` | `TAction` | Action string to check. |
| `data` | `PermissionData` | Optional context passed to function-based permissions. |

**Returns:** `boolean`

**Resolution order:**
1. Iterates the user's roles in order (plus `WILDCARD` appended last).
2. For each role, checks the specific resource first; if found but the action is absent, falls back to the wildcard resource.
3. The **first role that has an explicit opinion** (`true`, `false`, or a function result) **wins**.
4. Returns `false` if no role has an opinion.

```ts
permit.check(user, 'posts', 'read');                         // static check
permit.check(user, 'posts', 'update', { authorId: 'u1' });  // dynamic check
```

---

### `permit.for(user)`

Returns a pre-bound guard function for a specific user. Useful when making multiple checks for the same user in one scope.

```ts
const can = permit.for(user);

can('posts', 'read');                        // true
can('posts', 'update', { authorId: 'u1' }); // true
can('posts', 'delete');                     // false
```

The guard is **live** — it reflects any permissions defined after it was created.

**Returns:** `(resource: string, action: TAction, data?: PermissionData) => boolean`

---

### `permit.remove(role, resource?, action?)`

Remove permissions. Automatically cleans up empty resource and role entries.

| Call | Effect |
|---|---|
| `remove('admin')` | Removes the entire `admin` role. |
| `remove('admin', 'posts')` | Removes all actions on `posts` for `admin`. |
| `remove('admin', 'posts', 'delete')` | Removes only the `delete` action. |

No-op when the role, resource, or action does not exist.

---

### `permit.snapshot()`

Returns a plain-object **deep copy** of all registered permissions. Mutations to the snapshot do not affect internal state.

```ts
const snap = permit.snapshot();
// snap['admin']['posts']['read'] → true
```

**Returns:** `PermitSnapshot<TAction, TUser>`

---

### `permit.clear()`

Removes all registered permissions.

---

## `hasRole(user, role)`

Standalone utility. Returns `true` if the user has the given role (case-insensitive). Treats malformed users (null, missing `id`, missing `roles`) as `anonymous`.

```ts
import { hasRole, ANONYMOUS } from '@vielzeug/permit';

hasRole({ id: '1', roles: ['Admin'] }, 'admin'); // true
hasRole(null, ANONYMOUS);                        // true
hasRole(null, 'admin');                          // false
```

---

## `isAnonymous(user)`

Standalone utility. Returns `true` when the user is unauthenticated: `null`, missing `id`, or `roles` is not an array.

```ts
import { isAnonymous } from '@vielzeug/permit';

isAnonymous(null);                       // true
isAnonymous({ id: '1' });                // true  (no roles array)
isAnonymous({ id: '1', roles: [] });     // false (authenticated, no roles assigned)
isAnonymous({ id: '1', roles: ['x'] }); // false
```

---

## Constants

### `WILDCARD`

```ts
export const WILDCARD = '*';
```

Use as a **role** to apply to every user, or as a **resource** to apply to every resource.

### `ANONYMOUS`

```ts
export const ANONYMOUS = 'anonymous';
```

Automatic role assigned to users without a valid `id` or `roles` array.

---

## Types

### `BaseUser`

```ts
type BaseUser = {
  id: string;
  roles: string[];
};
```

### `PermissionCheck<TUser>`

```ts
type PermissionCheck<TUser extends BaseUser> =
  | boolean
  | ((user: TUser, data?: PermissionData) => boolean);
```

### `PermissionActions<TAction, TUser>`

```ts
type PermissionActions<TAction extends string, TUser extends BaseUser> =
  Partial<Record<TAction, PermissionCheck<TUser>>>;
```

### `PermitSnapshot<TAction, TUser>`

```ts
type PermitSnapshot<TAction extends string, TUser extends BaseUser> =
  Record<string, Record<string, PermissionActions<TAction, TUser>>>;
```

### `PermitOptions<TUser, TAction>`

```ts
type PermitOptions<TUser extends BaseUser, TAction extends string> = {
  logger?: (result: 'allow' | 'deny', user: TUser, resource: string, action: string) => void;
  roles?: Record<string, Record<string, PermissionActions<TAction, TUser>>>;
};
```

### `DefineOptions`

```ts
type DefineOptions = {
  replace?: boolean; // Default: false
};
```

### `PermissionData`

```ts
type PermissionData = Record<string, unknown>;
```

### `Permit<TUser, TAction>`

```ts
type Permit<TUser extends BaseUser, TAction extends string> = {
  check(user: TUser, resource: string, action: TAction, data?: PermissionData): boolean;
  define(role: string, resource: string, actions: PermissionActions<TAction, TUser>, opts?: DefineOptions): Permit<TUser, TAction>;
  for(user: TUser): (resource: string, action: TAction, data?: PermissionData) => boolean;
  remove(role: string, resource?: string, action?: TAction): void;
  snapshot(): PermitSnapshot<TAction, TUser>;
  clear(): void;
};
```
