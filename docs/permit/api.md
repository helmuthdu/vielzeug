---
title: Permit — API Reference
description: Complete API reference for Permit with type signatures and parameter documentation.
---

# Permit API Reference

[[toc]]

## `createPermit()`

Factory function that creates a new `Permit` instance.

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();                      // BaseUser, PermissionData
const typed = createPermit<MyUser, MyResource>();   // typed generics
```

**Returns:** `Permit<T, D>`

---

## `Permit<T, D>` class

### `permit.set(role, resource, actions, replace?)`

Register or update permissions for a role/resource pair.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `role` | `string` | — | Role name (case-insensitive) |
| `resource` | `string` | — | Resource name or `'*'` wildcard |
| `actions` | `PermissionActions<T, D>` | — | Permission map for CRUD actions |
| `replace` | `boolean` | `false` | Replace existing instead of merging |

```ts
permit.set('admin', '*', { create: true, read: true, update: true, delete: true });
permit.set('editor', 'posts', { update: (user, data) => user.id === data?.authorId });
```

### `permit.check(user, resource, action, data?)`

Check if a user has permission to perform an action on a resource.

| Parameter | Type | Description |
|---|---|---|
| `user` | `T` | User object with `id` and `roles` |
| `resource` | `string` | Resource name |
| `action` | `PermissionAction` | `'create' \| 'read' \| 'update' \| 'delete'` |
| `data` | `D` | Optional data passed to function permissions |

**Returns:** `boolean`

### `permit.remove(role, resource, action?)`

Remove permissions for a role/resource, or a single action if specified.

| Parameter | Type | Description |
|---|---|---|
| `role` | `string` | Role name |
| `resource` | `string` | Resource name |
| `action` | `PermissionAction \| undefined` | If omitted, removes all actions |

### `permit.hasRole(user, role)`

Check if a user has a specific role (case-insensitive).

| Parameter | Type | Description |
|---|---|---|
| `user` | `BaseUser` | User object |
| `role` | `string` | Role to check |

**Returns:** `boolean`

### `permit.roles`

Returns a deep copy of all registered permissions as a `RolesMap`.

```ts
const allRoles: RolesMap<T, D> = permit.roles;
```

### `permit.clear()`

Clears all registered permissions.

---

## Constants

### `WILDCARD`

```ts
export const WILDCARD = '*';
```

Use as resource or role name to match all resources or apply to all users.

### `ANONYMOUS`

```ts
export const ANONYMOUS = 'anonymous';
```

Automatic role assigned to users without `id` or `roles`.

---

## Types

### `BaseUser`

```ts
type BaseUser = {
  id: string;
  roles: string[];
};
```

### `PermissionAction`

```ts
type PermissionAction = 'create' | 'read' | 'update' | 'delete';
```

### `PermissionCheck<T, D>`

```ts
type PermissionCheck<T extends BaseUser, D extends PermissionData> =
  | boolean
  | ((user: T, data?: D) => boolean);
```

### `PermissionActions<T, D>`

```ts
type PermissionActions<T, D> = Partial<Record<PermissionAction, PermissionCheck<T, D>>>;
```

### `PermissionData`

```ts
type PermissionData = Record<string, unknown>;
```

### `RolesMap<T, D>`

```ts
type RolesMap<T, D> = Map<string, Map<string, PermissionActions<T, D>>>;
```
