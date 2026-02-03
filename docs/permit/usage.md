# Permit Usage Guide

Complete guide to installing and using Permit in your projects.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/permit
```

```sh [npm]
npm install @vielzeug/permit
```

```sh [yarn]
yarn add @vielzeug/permit
```

:::

## Import

```ts
import { Permit } from '@vielzeug/permit';
// Optional: Import types and constants
import type { BaseUser, PermissionAction, PermissionCheck } from '@vielzeug/permit';
import { WILDCARD } from '@vielzeug/permit';
```

## Basic Usage

### Registering Permissions

```ts
// Static permissions (always true/false)
Permit.register('admin', 'posts', {
  view: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('viewer', 'posts', {
  view: true,
  create: false,
  update: false,
  delete: false,
});
```

### Checking Permissions

```ts
const user = { id: '123', roles: ['viewer'] };

// Check if user can view posts
const canView = Permit.check(user, 'posts', 'view'); // true

// Check if user can delete posts
const canDelete = Permit.check(user, 'posts', 'delete'); // false
```

### Dynamic Permissions

```ts
// Function-based permissions for context-aware checks
Permit.register('author', 'posts', {
  update: (user, post) => user.id === post.authorId,
  delete: (user, post) => user.id === post.authorId && post.status === 'draft',
});

const user = { id: '123', roles: ['author'] };
const post = { id: 'p1', authorId: '123', status: 'draft' };

// Must provide data for dynamic permissions
const canUpdate = Permit.check(user, 'posts', 'update', post); // true
const canDelete = Permit.check(user, 'posts', 'delete', post); // true
```

## Advanced Features

### Wildcards

Use the exported `WILDCARD` constant for permissions that apply to all resources or roles:

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// Admin has all permissions on all resources
Permit.register('admin', WILDCARD, {
  view: true,
  create: true,
  update: true,
  delete: true,
});

// All roles can view posts
Permit.register(WILDCARD, 'posts', {
  view: true,
});
```

### Multiple Roles

Users can have multiple roles, and permissions are additive:

```ts
Permit.register('viewer', 'posts', { view: true });
Permit.register('creator', 'posts', { create: true });

const user = { id: '1', roles: ['viewer', 'creator'] };

// User has permissions from both roles
Permit.check(user, 'posts', 'view'); // true
Permit.check(user, 'posts', 'create'); // true
```

### Merging Permissions

Registering permissions for the same role/resource merges them:

```ts
Permit.register('editor', 'posts', { view: true, create: true });
Permit.register('editor', 'posts', { update: true }); // Adds to existing

// Editor now has: view, create, and update
```

### TypeScript Generics

Use generics for better type safety:

```ts
interface User extends BaseUser {
  email: string;
  department: string;
}

interface Post {
  id: string;
  authorId: string;
  department: string;
}

Permit.register<User, Post>('manager', 'posts', {
  update: (user, post) => {
    // Full type inference
    return user.department === post.department;
  },
});
```

### Clearing Permissions

```ts
// Clear all registered permissions
Permit.clear();

// Useful for testing or re-initialization
```

### Inspecting Permissions

```ts
// Get all registered permissions
const allPermissions = Permit.roles;

// Iterate over roles
for (const [role, resources] of allPermissions) {
  console.log(`Role: ${role}`);

  for (const [resource, actions] of resources) {
    console.log(`  Resource: ${resource}`, actions);
  }
}
```

## Permission Patterns

### Role-Based Access Control (RBAC)

```ts
// Define roles with specific permissions
Permit.register('admin', 'users', {
  view: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('moderator', 'users', {
  view: true,
  update: true,
});

Permit.register('user', 'users', {
  view: true,
});
```

### Resource Ownership

```ts
// Users can only modify their own resources
Permit.register('user', 'profile', {
  view: true,
  update: (user, profile) => user.id === profile.userId,
  delete: (user, profile) => user.id === profile.userId,
});
```

### Status-Based Permissions

```ts
// Permissions depend on resource status
Permit.register('editor', 'articles', {
  update: (user, article) => {
    return article.status === 'draft' || article.status === 'review';
  },
  delete: (user, article) => {
    return article.status === 'draft';
  },
});
```

### Hierarchical Permissions

```ts
// Combine role levels with resource ownership
Permit.register('admin', 'documents', {
  view: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('manager', 'documents', {
  view: true,
  create: true,
  update: (user, doc) => doc.department === user.department,
  delete: (user, doc) => doc.department === user.department,
});

Permit.register('employee', 'documents', {
  view: (user, doc) => doc.department === user.department,
  create: true,
  update: (user, doc) => doc.authorId === user.id,
  delete: (user, doc) => doc.authorId === user.id,
});
```

## Integration Patterns

### With Authentication

```ts
// After user login
function onLogin(user) {
  // Load user-specific permissions
  const permissions = await fetchUserPermissions(user.id);

  permissions.forEach((perm) => {
    Permit.register(perm.role, perm.resource, perm.actions);
  });
}
```

### With React

```tsx
import { Permit } from '@vielzeug/permit';
import { useAuth } from './auth';

function usePermission(resource: string, action: string, data?: any) {
  const { user } = useAuth();
  return Permit.check(user, resource, action, data);
}

// Usage
function DeleteButton({ post }) {
  const canDelete = usePermission('posts', 'delete', post);

  if (!canDelete) return null;

  return <button onClick={() => deletePost(post)}>Delete</button>;
}
```

### With Express

```ts
import { Permit } from '@vielzeug/permit';

function authorize(resource: string, action: string) {
  return (req, res, next) => {
    if (!Permit.check(req.user, resource, action, req.body)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

// Usage
app.delete('/api/posts/:id', authorize('posts', 'delete'), async (req, res) => {
  // Handle deletion
});
```

### With Vue

```ts
// composable
import { computed } from 'vue';
import { Permit } from '@vielzeug/permit';
import { useAuth } from './auth';

export function usePermission(resource: string, action: string, data?: any) {
  const { user } = useAuth();

  return computed(() => {
    return Permit.check(user.value, resource, action, data?.value);
  });
}
```

## Best Practices

1. **Register permissions early**: Register all permissions during app initialization
2. **Use TypeScript**: Leverage generics for type-safe permission functions
3. **Clear in tests**: Always call `Permit.clear()` before each test
4. **Validate user structure**: Ensure user has `id` and `roles` properties
5. **Provide data for dynamic permissions**: Function-based permissions need context
6. **Use constants**: Import and use `WILDCARD` instead of string literals
7. **Document permissions**: Comment why specific roles have certain permissions
8. **Audit regularly**: Use `Permit.roles` to inspect registered permissions

## Common Patterns

### Loading Permissions from Database

```ts
async function initializePermissions() {
  const permissions = await db.permissions.findAll();

  for (const perm of permissions) {
    Permit.register(perm.role, perm.resource, {
      view: perm.canView,
      create: perm.canCreate,
      update: perm.canUpdate,
      delete: perm.canDelete,
    });
  }
}
```

### Environment-Specific Permissions

```ts
if (process.env.NODE_ENV === 'development') {
  // Dev-only permissions
  Permit.register('developer', WILDCARD, {
    view: true,
    create: true,
    update: true,
    delete: true,
  });
}
```

### Caching Permission Checks

```ts
// For expensive permission checks
const permissionCache = new Map<string, boolean>();

function checkWithCache(user, resource, action, data?) {
  const key = `${user.id}-${resource}-${action}`;

  if (permissionCache.has(key)) {
    return permissionCache.get(key);
  }

  const result = Permit.check(user, resource, action, data);
  permissionCache.set(key, result);

  return result;
}
```

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Examples](./examples.md) - Practical code examples
