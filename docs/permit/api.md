# Permit API Reference

Complete API documentation for `@vielzeug/permit`.

## Table of Contents

[[toc]]

## Core Methods

### `Permit.register(role, resource, actions)`

Registers permissions for a specific role and resource combination.

**Parameters:**

- `role: string` - The role identifier (e.g., 'admin', 'editor', 'user')
- `resource: string` - The resource identifier (e.g., 'posts', 'comments')
- `actions: Partial<Record<PermissionAction, PermissionCheck<T, D>>>` - Permission definitions for each action

**Example:**

```ts
import { Permit, WILDCARD, ANONYMOUS } from '@vielzeug/permit';

// Static permissions
Permit.register('admin', 'posts', {
  view: true,
  create: true,
  update: true,
  delete: true,
});

// Dynamic permissions with functions
Permit.register('author', 'posts', {
  update: (user, post) => user.id === post.authorId,
  delete: (user, post) => user.id === post.authorId && post.status === 'draft',
});

// Using wildcards
Permit.register('admin', WILDCARD, {
  view: true,
  create: true,
  update: true,
  delete: true,
});

// Anonymous user permissions
Permit.register(ANONYMOUS, 'posts', {
  view: true,
});

// Case-insensitive (normalized)
Permit.register('Admin', 'Posts', { view: true });
// Same as: Permit.register('admin', 'posts', { view: true });
```

**Throws:**

- `Error` - If role is empty or missing
- `Error` - If resource is empty or missing
- `Error` - If invalid action is provided (must be 'view', 'create', 'update', or 'delete')

**Behavior:**

- Merges with existing permissions (doesn't replace)
- Normalizes role and resource (trimmed, lowercased)
- Validates action keys at runtime

---

### `Permit.check(user, resource, action, data?)`

Checks if a user has permission to perform a specific action on a resource.

**Parameters:**

- `user: T extends BaseUser` - User object with `id` and `roles` properties
- `resource: string` - The resource to check permissions for
- `action: PermissionAction` - The action to check ('view' | 'create' | 'update' | 'delete')
- `data?: D` - Optional contextual data for dynamic permission functions

**Returns:** `boolean` - `true` if permission is granted, `false` otherwise

**Example:**

```ts
const user = { id: '123', roles: ['editor'] };

// Basic check
const canView = Permit.check(user, 'posts', 'view');

// With contextual data for dynamic rules
const post = { id: 'p1', authorId: '123', status: 'draft' };
const canDelete = Permit.check(user, 'posts', 'delete', post);

// Normalized matching
const userCaps = { id: '456', roles: ['ADMIN'] };
Permit.check(userCaps, 'POSTS', 'view'); // Matches 'admin' role, 'posts' resource
```

**Behavior:**

- Uses "allow on any true" policy - first matching allow grants access
- Checks specific roles before wildcard role
- Normalizes role and resource (case-insensitive, trimmed)
- Function-based permissions require `data` parameter (returns false if data is undefined)
- Malformed users (missing `id` or `roles`) treated as ANONYMOUS + WILDCARD
- Returns `false` if no permissions are found

---

### `Permit.set(role, resource, actions, replace?)`

Sets permissions for a role and resource, optionally replacing existing ones.

**Parameters:**

- `role: string` - The role identifier
- `resource: string` - The resource identifier
- `actions: Partial<Record<PermissionAction, PermissionCheck<T, D>>>` - Permission definitions
- `replace?: boolean` - If true, replaces existing; if false, merges (default: false)

**Returns:** `void`

**Example:**

```ts
// Merge with existing (default)
Permit.set('editor', 'posts', { view: true, create: true });

// Replace completely
Permit.set('editor', 'posts', { view: true }, true);
// Now editor only has 'view', other actions removed
```

**Throws:**

- `Error` - If role is empty or missing
- `Error` - If resource is empty or missing
- `Error` - If invalid action is provided

---

### `Permit.unregister(role, resource, action?)`

Removes permissions for a role and resource.

**Parameters:**

- `role: string` - The role identifier
- `resource: string` - The resource identifier
- `action?: PermissionAction` - Optional specific action to remove

**Returns:** `void`

**Example:**

```ts
// Remove specific action
Permit.unregister('editor', 'posts', 'delete');

// Remove all actions for resource
Permit.unregister('editor', 'posts');
```

**Behavior:**

- Automatically cleans up empty resource entries
- Automatically cleans up empty role entries
- Safe to call on non-existent permissions (no error)

---

### `Permit.hasRole(user, role)`

Checks if a user has a specific role.

**Parameters:**

- `user: BaseUser` - User object
- `role: string` - Role to check for

**Returns:** `boolean` - `true` if user has the role, `false` otherwise

**Example:**

```ts
const user = { id: '1', roles: ['Admin', 'Editor'] };

Permit.hasRole(user, 'admin'); // true (normalized)
Permit.hasRole(user, 'EDITOR'); // true (normalized)
Permit.hasRole(user, 'moderator'); // false

// For malformed users
const malformed = null;
Permit.hasRole(malformed, ANONYMOUS); // true
Permit.hasRole(malformed, 'admin'); // false
```

**Behavior:**

- Case-insensitive comparison (normalized)
- Returns `true` for ANONYMOUS if user is malformed

---

### `Permit.clear()`

Clears all registered permissions from the registry.

**Returns:** `void`

**Example:**

```ts
// Clear all permissions (useful for testing)
Permit.clear();

// Re-register fresh permissions
Permit.register('admin', 'posts', { view: true });
```

**Use Cases:**

- Resetting permissions between tests
- Re-initializing permission system
- Clearing permissions before loading from database

---

### `Permit.roles`

Getter that returns a deep copy of all registered roles and their permissions.

**Returns:** `RolesWithPermissions` - Map of roles to their resource permissions

**Example:**

```ts
const allRoles = Permit.roles;

// Inspect registered permissions
for (const [role, resources] of allRoles) {
  console.log(`Role: ${role}`);
  for (const [resource, actions] of resources) {
    console.log(`  Resource: ${resource}`, actions);
  }
}

// Safe to modify - doesn't affect internal state
allRoles.clear(); // Only clears the copy
const adminPerms = allRoles.get('admin');
if (adminPerms) {
  adminPerms.get('posts').view = false; // Only affects the copy
}
```

**Note:** Returns a deep copy to prevent external modification of internal state. All nested Maps and action objects are cloned.

## Constants

### `WILDCARD`

Constant representing wildcard role/resource that matches everything.

```ts
export const WILDCARD = '*';
```

**Usage:**

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// Admin can do everything on all resources
Permit.register('admin', WILDCARD, {
  view: true,
  create: true,
  update: true,
  delete: true,
});

// All users can view posts
Permit.register(WILDCARD, 'posts', { view: true });
```

---

### `ANONYMOUS`

Constant representing anonymous/unauthenticated users.

```ts
export const ANONYMOUS = 'anonymous';
```

**Usage:**

```ts
import { Permit, ANONYMOUS } from '@vielzeug/permit';

// Public read access
Permit.register(ANONYMOUS, 'posts', { view: true });

// Malformed users are treated as ANONYMOUS
const malformedUser = null;
Permit.check(malformedUser, 'posts', 'view'); // true
```

## Types

### `BaseUser`

The base user type required for permission checks.

```ts
interface BaseUser {
  id: string;
  roles: string[];
}
```

**Properties:**

- `id: string` - Unique user identifier
- `roles: string[]` - Array of role identifiers

**Example:**

```ts
const user: BaseUser = {
  id: 'user-123',
  roles: ['editor', 'viewer'],
};
```

---

### `PermissionAction`

Available permission actions.

```ts
type PermissionAction = 'view' | 'create' | 'update' | 'delete';
```

**Actions:**

- `'view'` - Read/view permission
- `'create'` - Create/add permission
- `'update'` - Modify/edit permission
- `'delete'` - Remove/delete permission

---

### `PermissionCheck<T, D>`

A permission can be either a static boolean or a dynamic function.

```ts
type PermissionCheck<T extends BaseUser, D extends PermissionData> = boolean | ((user: T, data: D) => boolean);
```

**Variants:**

- `boolean` - Static permission (always true/false)
- `(user, data) => boolean` - Dynamic permission based on context

**Example:**

```ts
// Static permission
const staticPermission: PermissionCheck = true;

// Dynamic permission
const dynamicPermission: PermissionCheck = (user, post) => {
  return user.id === post.authorId;
};
```

---

### `PermissionData`

Type alias for contextual data used in permission checks.

```ts
type PermissionData = Record<string, any>;
```

This can be any object structure relevant to your permission logic.

**Example:**

```ts
interface Post extends PermissionData {
  id: string;
  authorId: string;
  status: 'draft' | 'published';
}
```

---

### `PermissionMap<T, D>`

Type for a resource's action permissions.

```ts
type PermissionMap<T extends BaseUser, D extends PermissionData> = Partial<
  Record<PermissionAction, PermissionCheck<T, D>>
>;
```

**Example:**

```ts
const postPermissions: PermissionMap<User, Post> = {
  view: true,
  create: true,
  update: (user, post) => user.id === post.authorId,
  delete: (user, post) => user.id === post.authorId && post.status === 'draft',
};
```

---

### `ResourcePermissions<T, D>`

Type for all resource permissions under a role.

```ts
type ResourcePermissions<T extends BaseUser, D extends PermissionData> = Map<
  string,
  Partial<Record<PermissionAction, PermissionCheck<T, D>>>
>;
```

**Example:**

```ts
const editorResources: ResourcePermissions<User, any> = new Map([
  ['posts', { view: true, create: true, update: true }],
  ['comments', { view: true, create: true }],
]);
```

---

### `RolesWithPermissions<T, D>`

Type for the complete permissions registry.

```ts
type RolesWithPermissions<T extends BaseUser, D extends PermissionData> = Map<string, ResourcePermissions<T, D>>;
```

**Example:**

```ts
const allPermissions: RolesWithPermissions<User, any> = new Map([
  ['admin', adminResources],
  ['editor', editorResources],
  ['viewer', viewerResources],
]);
```

}

````

---

### `WILDCARD`

Exported constant for wildcard matching.

```ts
export const WILDCARD = '*';
````

Use this constant to define permissions that apply to all resources or roles.

**Example:**

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// Admin has all permissions on all resources
Permit.register('admin', WILDCARD, {
  view: true,
  create: true,
  update: true,
  delete: true,
});
```

## Advanced Usage

### Generic Type Parameters

You can specify custom user and data types for better type safety:

```ts
interface CustomUser extends BaseUser {
  email: string;
  department: string;
}

interface Post {
  id: string;
  authorId: string;
  department: string;
  status: string;
}

Permit.register<CustomUser, Post>('manager', 'posts', {
  update: (user, post) => {
    // Full type inference for user and post
    return user.department === post.department;
  },
});
```

### Combining Multiple Roles

Users can have multiple roles, and permissions are additive:

```ts
Permit.register('viewer', 'posts', { view: true });
Permit.register('creator', 'posts', { create: true });

const user = { id: '1', roles: ['viewer', 'creator'] };

Permit.check(user, 'posts', 'view'); // true (from viewer role)
Permit.check(user, 'posts', 'create'); // true (from creator role)
Permit.check(user, 'posts', 'delete'); // false (no role grants this)
```

### Wildcard Patterns

#### Wildcard Resource

```ts
// Role has all permissions on ALL resources
Permit.register('admin', WILDCARD, {
  view: true,
  create: true,
  update: true,
  delete: true,
});
```

#### Wildcard Role

```ts
// ALL roles have view permission on posts
Permit.register(WILDCARD, 'posts', { view: true });
```

### Function-Based Permissions

Function-based permissions receive the user and contextual data:

```ts
Permit.register('author', 'posts', {
  update: (user, post) => {
    // Complex logic
    if (post.status === 'published') {
      return user.id === post.authorId;
    }
    return false;
  },
});

// Must provide data when checking
const canUpdate = Permit.check(user, 'posts', 'update', post);
```

**Important:** Function permissions require the `data` parameter in `check()`. Without it, the function returns `false`.

### Merging Permissions

Registering permissions for the same role/resource combination merges them:

```ts
Permit.register('editor', 'posts', { view: true, create: true });
Permit.register('editor', 'posts', { update: true }); // Merges

// Editor now has: view, create, AND update
```

### Inspecting Registered Permissions

```ts
// Get all registered permissions
const allPermissions = Permit.roles;

// Check if a specific role exists
const hasRole = allPermissions.has('admin');

// Get permissions for a specific role
const adminPerms = allPermissions.get('admin');
if (adminPerms) {
  const postPerms = adminPerms.get('posts');
  console.log('Admin post permissions:', postPerms);
}
```

### Testing Permissions

```ts
import { Permit } from '@vielzeug/permit';

describe('Post Permissions', () => {
  beforeEach(() => {
    Permit.clear(); // Reset before each test
  });

  it('allows authors to update their own posts', () => {
    Permit.register('author', 'posts', {
      update: (user, post) => user.id === post.authorId,
    });

    const user = { id: '123', roles: ['author'] };
    const post = { authorId: '123' };

    expect(Permit.check(user, 'posts', 'update', post)).toBe(true);
  });

  it('denies authors from updating others posts', () => {
    Permit.register('author', 'posts', {
      update: (user, post) => user.id === post.authorId,
    });

    const user = { id: '123', roles: ['author'] };
    const post = { authorId: '456' };

    expect(Permit.check(user, 'posts', 'update', post)).toBe(false);
  });
});
```
