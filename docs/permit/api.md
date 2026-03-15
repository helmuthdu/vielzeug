---
title: Permit — API Reference
description: Complete API reference for Permit with type signatures and parameter documentation.
---

## Permit API Reference

[[toc]]

## `createPermit(opts?)`

Factory function that creates a new `Permit` instance.

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit(); // defaults
const typed = createPermit<MyUser>(); // typed user
const strict = createPermit<MyUser, 'read' | 'write'>(); // typed actions
const full = createPermit<MyUser, 'read' | 'write', PostData>(); // typed data
```

| Parameter               | Type                                              | Default | Description                                                             |
| ----------------------- | ------------------------------------------------- | ------- | ----------------------------------------------------------------------- |
| `opts.initial`          | `PermitState<TUser, TAction, TData>`              | —       | Seed permissions and hierarchy at creation time.                        |
| `opts.logger`           | `(result, user, resource, action, data?) => void` | —       | Called on every `check()`. Useful for auditing.                         |
| `opts.wildcardFallback` | `boolean`                                         | `true`  | When `false`, disables wildcard-resource fallback for specific entries. |
| `opts.strict`           | `boolean`                                         | `false` | When `true`, configuration errors throw instead of silently continuing. |

**Returns:** `Permit<TUser, TAction, TData>`

## `Permit<TUser, TAction, TData>`

### `permit.define(role, resource, actions)`

Define or update permissions for a role/resource pair. Always merges with existing actions. Returns the permit instance for fluent chaining.

| Parameter  | Type                                       | Description                                              |
| ---------- | ------------------------------------------ | -------------------------------------------------------- |
| `role`     | `string`                                   | Role name. Case-insensitive, whitespace-trimmed.         |
| `resource` | `string`                                   | Resource name, or `'*'` to match all resources.          |
| `actions`  | `PermissionActions<TAction, TUser, TData>` | Map of action → `boolean` or `(user, data?) => boolean`. |

```ts
permit.define('editor', 'posts', { read: true });
permit.define('editor', 'posts', { write: true }); // now has read + write

// Dynamic rule
permit.define('editor', 'posts', { update: (user, data) => user.id === data?.authorId });

// Wildcard action — grants any action on posts
permit.define('admin', 'posts', { [WILDCARD]: true });
```

**Throws:** `Error('Role is required')` / `Error('Resource is required')` when either is empty.
When `strict: true`, also throws if the actions map is empty.

**Returns:** `Permit<TUser, TAction, TData>`

---

### `permit.grant(role, resource, ...actions)`

Shorthand to allow one or more actions. Equivalent to calling `define` with `{ action: true }` for each action.

| Parameter    | Type        | Description                          |
| ------------ | ----------- | ------------------------------------ |
| `role`       | `string`    | Role name.                           |
| `resource`   | `string`    | Resource name, or `'*'` for all.     |
| `...actions` | `TAction[]` | One or more action strings to allow. |

```ts
permit.grant('admin', WILDCARD, 'read', 'write', 'delete');
permit.grant(ANONYMOUS, 'public', 'read');
```

**Returns:** `Permit<TUser, TAction, TData>`

---

### `permit.deny(role, resource, ...actions)`

Shorthand to block one or more actions. Equivalent to calling `define` with `{ action: false }` for each action.

| Parameter    | Type        | Description                          |
| ------------ | ----------- | ------------------------------------ |
| `role`       | `string`    | Role name.                           |
| `resource`   | `string`    | Resource name.                       |
| `...actions` | `TAction[]` | One or more action strings to block. |

```ts
permit.deny('blocked', 'posts', 'write', 'delete');
```

**Returns:** `Permit<TUser, TAction, TData>`

---

### `permit.extend(childRole, parentRole)`

Declares that `childRole` inherits all permissions of `parentRole`. Resolution is BFS — the child's own permissions always take precedence over inherited ones. Supports multiple levels and multiple parents.

| Parameter    | Type     | Description               |
| ------------ | -------- | ------------------------- |
| `childRole`  | `string` | The inheriting role.      |
| `parentRole` | `string` | The role to inherit from. |

```ts
permit.grant('viewer', '*', 'read');
permit.extend('editor', 'viewer'); // editor inherits viewer
permit.extend('admin', 'editor'); // admin inherits editor (multi-level)

// Multiple parents
permit.extend('editor', 'commentor');
```

**Returns:** `Permit<TUser, TAction, TData>`

---

### `permit.unextend(childRole, parentRole?)`

Removes an inherited parent relationship. Omit `parentRole` to remove all parents.

| Parameter     | Type     | Description                                                     |
| ------------- | -------- | --------------------------------------------------------------- |
| `childRole`   | `string` | The role to modify.                                             |
| `parentRole?` | `string` | The parent to remove. Omit to remove all parents for the child. |

```ts
permit.unextend('admin', 'editor'); // remove one parent
permit.unextend('admin'); // remove all parents for admin
```

No-op when the relationship does not exist. **Returns:** `Permit<TUser, TAction, TData>`

---

### `permit.check(user, resource, action, data?)`

Check if a user has permission to perform an action on a resource.

| Parameter  | Type                         | Description                                            |
| ---------- | ---------------------------- | ------------------------------------------------------ |
| `user`     | `TUser \| null \| undefined` | User object. `null`/`undefined` treated as anonymous.  |
| `resource` | `string`                     | Resource name. Case-insensitive.                       |
| `action`   | `TAction`                    | Action string to check.                                |
| `data?`    | `TData`                      | Optional context passed to function-based permissions. |

**Returns:** `boolean`

**Resolution order:**

1. Yields user's roles via BFS over the hierarchy, appending `WILDCARD` last.
2. For each role, checks the specific resource first. If the action is absent and `wildcardFallback` is `true`, falls back to the wildcard resource.
3. Within a resource, checks the specific action first, then the `'*'` action key.
4. **First role that has any opinion** (`true`, `false`, or a function result) **wins**.
5. Returns `false` if no role has an opinion.

```ts
permit.check(user, 'posts', 'read'); // static check
permit.check(user, 'posts', 'update', { authorId: '1' }); // dynamic check
```

---

### `permit.checkAll(user, resource, actions, data?)`

Returns `true` only if the user can perform **every** action in the array.

| Parameter  | Type                         | Description            |
| ---------- | ---------------------------- | ---------------------- |
| `user`     | `TUser \| null \| undefined` | User to check.         |
| `resource` | `string`                     | Resource name.         |
| `actions`  | `TAction[]`                  | Actions to check.      |
| `data?`    | `TData`                      | Optional context data. |

```ts
permit.checkAll(user, 'posts', ['read', 'write']); // true if both pass
permit.checkAll(user, 'posts', ['read', 'write'], postData); // with context
```

**Returns:** `boolean`

---

### `permit.checkAny(user, resource, actions, data?)`

Returns `true` if the user can perform **at least one** action in the array.

```ts
permit.checkAny(user, 'posts', ['write', 'delete']); // true if either passes
```

**Returns:** `boolean`

---

### `permit.for(user)`

Returns a `PermitGuard` pre-bound to a specific user. Useful when making multiple checks for the same user in one scope.

```ts
const guard = permit.for(user);

guard.can('posts', 'read'); // true
guard.can('posts', 'update', { authorId: 'u1' }); // true (dynamic rule)
guard.canAll('posts', ['read', 'write']); // true if ALL pass
guard.canAny('posts', ['write', 'delete']); // true if ANY passes
```

The guard is **live** — it reflects permissions defined after it was created. Accepts `null`/`undefined` users.

**Returns:** `PermitGuard<TAction, TData>`

| Method   | Signature                                 | Description                           |
| -------- | ----------------------------------------- | ------------------------------------- |
| `can`    | `(resource, action, data?) => boolean`    | Check a single action.                |
| `canAll` | `(resource, actions[], data?) => boolean` | `true` only if every action passes.   |
| `canAny` | `(resource, actions[], data?) => boolean` | `true` if at least one action passes. |

---

### `permit.remove(role, resource?, action?)`

Removes permissions. Automatically cleans up empty resource and role entries. Returns the permit for chaining.

| Call                                 | Effect                                      |
| ------------------------------------ | ------------------------------------------- |
| `remove('admin')`                    | Removes the entire `admin` role.            |
| `remove('admin', 'posts')`           | Removes all actions on `posts` for `admin`. |
| `remove('admin', 'posts', 'delete')` | Removes only the `delete` action.           |

No-op when the role, resource, or action does not exist.

**Returns:** `Permit<TUser, TAction, TData>`

---

### `permit.snapshot()`

Returns a `PermitState` — a **deep copy** of all registered permissions and the role inheritance hierarchy. Mutations to the result do not affect internal state.

::: warning
Dynamic (function) permissions are **not JSON-serializable**. Use snapshots for in-memory transfer only.
:::

```ts
const state = permit.snapshot();
// state.permissions['admin']['posts'] → { read: true, write: true }
// state.hierarchy?.admin              → ['editor']  (omitted if no hierarchy)
```

**Returns:** `PermitState<TUser, TAction, TData>`

---

### `permit.restore(state)`

Replaces all current permissions **and** hierarchy with those from a `PermitState`. Normalizes keys (trims, lowercases) on restore.

```ts
const state = permit.snapshot();
permit.clear();
permit.restore(state); // back to previous state, including hierarchy
```

**Returns:** `Permit<TUser, TAction, TData>`

---

### `permit.clear()`

Removes all registered permissions **and** the role inheritance hierarchy.

**Returns:** `Permit<TUser, TAction, TData>`

---

## `hasRole(user, role)`

Standalone utility. Returns `true` if the user has the given role (case-insensitive). Treats malformed users (null, missing `id`, missing `roles`) as `anonymous`.

```ts
import { hasRole, ANONYMOUS } from '@vielzeug/permit';

hasRole({ id: '1', roles: ['Admin'] }, 'admin'); // true
hasRole(null, ANONYMOUS); // true
hasRole(null, 'admin'); // false
```

---

## `isAnonymous(user)`

Standalone utility. Returns `true` when the user is unauthenticated: `null`, missing `id`, or `roles` is not an array.

```ts
import { isAnonymous } from '@vielzeug/permit';

isAnonymous(null); // true
isAnonymous({ id: '1' }); // true  (no roles array)
isAnonymous({ id: '1', roles: [] }); // false (authenticated, no roles assigned)
isAnonymous({ id: '1', roles: ['x'] }); // false
```

---

## Constants

### `WILDCARD`

```ts
export const WILDCARD = '*';
```

Use as a **role** to apply to every user, as a **resource** to apply to every resource, or as an **action key** in `define()` to match any action.

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

Minimum shape required for a user object. Extend with your own fields and pass as `TUser`.

### `PermissionCheck<TUser, TData>`

```ts
type PermissionCheck<TUser, TData> = boolean | ((user: TUser, data?: TData) => boolean);
```

A single permission value: a static boolean, or a function that receives the user and optional context data.

### `PermissionActions<TAction, TUser, TData>`

```ts
type PermissionActions<TAction extends string, TUser, TData> = Partial<
  Record<TAction | '*', PermissionCheck<TUser, TData>>
>;
```

Map of action strings (including the `'*'` wildcard action) to `PermissionCheck` values.

### `PermitSnapshot<TUser, TAction, TData>`

```ts
type PermitSnapshot<TUser, TAction extends string, TData> = Record<
  string,
  Record<string, PermissionActions<TAction, TUser, TData>>
>;
```

Plain-object representation of the permissions map: `role → resource → actions`.

### `PermitState<TUser, TAction, TData>`

```ts
type PermitState<TUser, TAction extends string, TData> = {
  permissions: PermitSnapshot<TUser, TAction, TData>;
  hierarchy?: Record<string, string[]>; // child → parent roles; omitted when empty
};
```

Full serializable state produced by `snapshot()` and consumed by `restore()` / `opts.initial`. Captures both the permission map and role inheritance.

### `PermitGuard<TAction, TData>`

```ts
type PermitGuard<TAction extends string, TData> = {
  can(resource: string, action: TAction, data?: TData): boolean;
  canAll(resource: string, actions: TAction[], data?: TData): boolean;
  canAny(resource: string, actions: TAction[], data?: TData): boolean;
};
```

### `PermitOptions<TUser, TAction, TData>`

```ts
type PermitOptions<TUser, TAction extends string, TData> = {
  initial?: PermitState<TUser, TAction, TData>;
  logger?: (
    result: 'allow' | 'deny',
    user: TUser | null | undefined,
    resource: string,
    action: string,
    data?: TData,
  ) => void;
  wildcardFallback?: boolean;
  strict?: boolean;
};
```

### `PermissionData`

```ts
type PermissionData = Record<string, unknown>;
```

Default type for context data passed to dynamic permission functions. Override with `TData` for type safety.

### `Permit<TUser, TAction>`

```ts
type Permit<TUser, TAction extends string> = {
  check(user: TUser | null | undefined, resource: string, action: TAction, data?: PermissionData): boolean;
  register(role: string, resource: string, actions: PermissionActions<TAction, TUser>): Permit<TUser, TAction>;
  grant(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction>;
  deny(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction>;
  for(user: TUser | null | undefined): PermitGuard<TAction>;
  remove(role: string, resource?: string, action?: TAction): Permit<TUser, TAction>;
  snapshot(): PermitSnapshot<TUser, TAction>;
  restore(snapshot: PermitSnapshot<TUser, TAction>): Permit<TUser, TAction>;
  clear(): Permit<TUser, TAction>;
};
```
