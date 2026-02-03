# Permit API Reference

Complete API documentation for `@vielzeug/permit`.

## Core Methods

### `Permit.register(role, resource, actions)`

Registers permissions for a specific role and resource combination.

**Parameters:**

- `role: string` - The role identifier (e.g., 'admin', 'editor', 'user')
- `resource: string` - The resource identifier (e.g., 'posts', 'comments')
- `actions: Partial<Record<PermissionAction, PermissionCheck>>` - Permission definitions for each action

**Example:**

```ts
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
import { WILDCARD } from '@vielzeug/permit';

Permit.register('admin', WILDCARD, {
  view: true,
  create: true,
  update: true,
  delete: true,
});
```

**Throws:**

- `Error` - If role is empty or missing
- `Error` - If resource is empty or missing

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
```

**Behavior:**

- Checks all user roles (including wildcard role `*`)
- Returns `true` if ANY role grants permission
- Function-based permissions require `data` parameter
- Returns `false` if no permissions are found

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

Getter that returns a shallow copy of all registered roles and their permissions.

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
```

**Note:** Returns a shallow copy to prevent direct modification of internal state. Nested Maps are not deep-cloned.

---

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

### `WILDCARD`

Exported constant for wildcard matching.

```ts
export const WILDCARD = '*';
```

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

---

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
