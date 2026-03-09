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

const permit = createPermit(); // defaults: BaseUser, string actions
const typed = createPermit<MyUser>(); // typed user
const strict = createPermit<MyUser, 'read' | 'write' | 'delete'>(); // typed actions
```

| Parameter      | Type                                              | Description                                     |
| -------------- | ------------------------------------------------- | ----------------------------------------------- |
| `opts.logger`  | `(result, user, resource, action, data?) => void` | Called on every `check()`. Useful for auditing. |
| `opts.initial` | `PermitSnapshot<TUser, TAction>`                  | Seed initial permissions at creation time.      |

**Returns:** `Permit<TUser, TAction>`

## `Permit<TUser, TAction>`

### `permit.register(role, resource, actions)`

Register or update permissions for a role/resource pair. Always merges with existing actions. Returns the permit instance for fluent chaining.

| Parameter  | Type                                | Description                                              |
| ---------- | ----------------------------------- | -------------------------------------------------------- |
| `role`     | `string`                            | Role name. Case-insensitive, whitespace-trimmed.         |
| `resource` | `string`                            | Resource name, or `'*'` to match all resources.          |
| `actions`  | `PermissionActions<TAction, TUser>` | Map of action → `boolean` or `(user, data?) => boolean`. |

```ts
permit.register('editor', 'posts', { read: true });
permit.register('editor', 'posts', { write: true }); // now has read + write

// Dynamic rule
permit.register('editor', 'posts', { delete: (user, data) => user.id === data?.authorId });

// Fluent chaining — all write methods return Permit
permit.grant('admin', '*', 'read', 'write', 'delete').register('viewer', '*', { read: true });
```

**Throws:** `Error('Role is required')` / `Error('Resource is required')` when either is empty.

---

### `permit.grant(role, resource, ...actions)`

Shorthand to allow one or more actions. Equivalent to calling `register` with `{ action: true }` for each action.

| Parameter    | Type        | Description                          |
| ------------ | ----------- | ------------------------------------ |
| `role`       | `string`    | Role name.                           |
| `resource`   | `string`    | Resource name, or `'*'` for all.     |
| `...actions` | `TAction[]` | One or more action strings to allow. |

```ts
permit.grant('admin', '*', 'read', 'write', 'delete');
permit.grant(ANONYMOUS, 'public', 'read');
```

**Returns:** `Permit<TUser, TAction>`

---

### `permit.deny(role, resource, ...actions)`

Shorthand to block one or more actions. Equivalent to calling `register` with `{ action: false }` for each action.

| Parameter    | Type        | Description                          |
| ------------ | ----------- | ------------------------------------ |
| `role`       | `string`    | Role name.                           |
| `resource`   | `string`    | Resource name.                       |
| `...actions` | `TAction[]` | One or more action strings to block. |

```ts
permit.deny('blocked', 'posts', 'write', 'delete');
```

**Returns:** `Permit<TUser, TAction>`

---

### `permit.check(user, resource, action, data?)`

Check if a user has permission to perform an action on a resource.

| Parameter  | Type             | Description                                            |
| ---------- | ---------------- | ------------------------------------------------------ |
| `user`     | `TUser`          | User object with `id` and `roles`.                     |
| `resource` | `string`         | Resource name. Case-insensitive.                       |
| `action`   | `TAction`        | Action string to check.                                |
| `data`     | `PermissionData` | Optional context passed to function-based permissions. |

**Returns:** `boolean`

**Resolution order:**

1. Iterates the user's roles in order (plus `WILDCARD` appended last).
2. For each role, checks the specific resource first; if found but the action is absent, falls back to the wildcard resource.
3. The **first role that has an explicit opinion** (`true`, `false`, or a function result) **wins**.
4. Returns `false` if no role has an opinion.

```ts
permit.check(user, 'posts', 'read'); // static check
permit.check(user, 'posts', 'update', { authorId: 'u1' }); // dynamic check
```

---

### `permit.for(user)`

Returns a `PermitGuard` pre-bound to a specific user. Useful when making multiple checks for the same user in one scope.

```ts
const guard = permit.for(user);

guard.can('posts', 'read');                        // true
guard.can('posts', 'update', { authorId: 'u1' }); // true (dynamic rule)
guard.canAll('posts', ['read', 'write']);           // true if ALL pass
guard.canAny('posts', ['write', 'delete']);         // true if ANY passes
guard.can('posts', 'delete');                      // false
```

The guard is **live** — it reflects any permissions defined after it was created. Accepts `null`/`undefined` users (treated as anonymous).

**Returns:** `PermitGuard<TAction>`

| Method   | Signature                                 | Description                           |
| -------- | ----------------------------------------- | ------------------------------------- |
| `can`    | `(resource, action, data?) => boolean`    | Check a single action.                |
| `canAll` | `(resource, actions[], data?) => boolean` | `true` only if every action passes.   |
| `canAny` | `(resource, actions[], data?) => boolean` | `true` if at least one action passes. |

---

### `permit.remove(role, resource?, action?)`

Remove permissions. Automatically cleans up empty resource and role entries.

| Call                                 | Effect                                      |
| ------------------------------------ | ------------------------------------------- |
| `remove('admin')`                    | Removes the entire `admin` role.            |
| `remove('admin', 'posts')`           | Removes all actions on `posts` for `admin`. |
| `remove('admin', 'posts', 'delete')` | Removes only the `delete` action.           |

No-op when the role, resource, or action does not exist. Returns the permit for chaining.

**Returns:** `Permit<TUser, TAction>`

---

### `permit.snapshot()`

Returns a plain-object **deep copy** of all registered permissions. Mutations to the snapshot do not affect internal state.

```ts
const snap = permit.snapshot();
// snap['admin']['posts']['read'] → true
```

**Returns:** `PermitSnapshot<TUser, TAction>`

---

### `permit.restore(snapshot)`

Replaces all current permissions with those from a snapshot. Useful for seeding, testing, or switching tenant configs.

```ts
const snap = permit.snapshot();
permit.clear();
permit.restore(snap); // back to previous state
```

**Returns:** `Permit<TUser, TAction>`

---

### `permit.clear()`

Removes all registered permissions.

**Returns:** `Permit<TUser, TAction>`

## `hasRole(user, role)`

Standalone utility. Returns `true` if the user has the given role (case-insensitive). Treats malformed users (null, missing `id`, missing `roles`) as `anonymous`.

```ts
import { hasRole, ANONYMOUS } from '@vielzeug/permit';

hasRole({ id: '1', roles: ['Admin'] }, 'admin'); // true
hasRole(null, ANONYMOUS); // true
hasRole(null, 'admin'); // false
```

## `isAnonymous(user)`

Standalone utility. Returns `true` when the user is unauthenticated: `null`, missing `id`, or `roles` is not an array.

```ts
import { isAnonymous } from '@vielzeug/permit';

isAnonymous(null); // true
isAnonymous({ id: '1' }); // true  (no roles array)
isAnonymous({ id: '1', roles: [] }); // false (authenticated, no roles assigned)
isAnonymous({ id: '1', roles: ['x'] }); // false
```

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
type PermissionCheck<TUser> = boolean | ((user: TUser, data?: PermissionData) => boolean);
```

### `PermissionActions<TAction, TUser>`

```ts
type PermissionActions<TAction extends string, TUser> = Partial<Record<TAction, PermissionCheck<TUser>>>;
```

### `PermitSnapshot<TUser, TAction>`

```ts
type PermitSnapshot<TUser, TAction extends string> = Record<
  string,
  Record<string, PermissionActions<TAction, TUser>>
>;
```

### `PermitGuard<TAction>`

```ts
type PermitGuard<TAction extends string = string> = {
  can(resource: string, action: TAction, data?: PermissionData): boolean;
  canAny(resource: string, actions: TAction[], data?: PermissionData): boolean;
  canAll(resource: string, actions: TAction[], data?: PermissionData): boolean;
};
```

### `PermitOptions<TUser, TAction>`

```ts
type PermitOptions<TUser, TAction extends string> = {
  logger?: (
    result: 'allow' | 'deny',
    user: TUser | null | undefined,
    resource: string,
    action: string,
    data?: PermissionData,
  ) => void;
  initial?: PermitSnapshot<TUser, TAction>;
};
```

### `PermissionData`

```ts
type PermissionData = Record<string, unknown>;
```

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
