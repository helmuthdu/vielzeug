# Permit Usage Guide

Complete guide to installing and using Permit in your projects.

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

[[toc]]

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
import type {
  BaseUser,
  PermissionAction,
  PermissionCheck,
  PermissionMap,
  ResourcePermissions,
  RolesWithPermissions,
} from '@vielzeug/permit';

import { WILDCARD, ANONYMOUS } from '@vielzeug/permit';
```

## Basic Usage

### Registering Permissions

```ts
// Static permissions (always true/false)
Permit.register('admin', 'posts', {
  read: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('viewer', 'posts', {
  read: true,
  create: false,
  update: false,
  delete: false,
});

// Permissions are normalized (case-insensitive, trimmed)
Permit.register('Editor', 'Posts', { read: true });
// Same as: Permit.register('editor', 'posts', { read: true });
```

### Checking Permissions

```ts
const user = { id: '123', roles: ['viewer'] };

// Check if user can view posts
const canView = Permit.check(user, 'posts', 'read'); // true

// Check if user can delete posts
const canDelete = Permit.check(user, 'posts', 'delete'); // false

// Role and resource names are normalized
const userWithCaps = { id: '456', roles: ['EDITOR'] };
Permit.check(userWithCaps, 'POSTS', 'read'); // true (normalized matching)
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

// Without data, function permissions return false
Permit.check(user, 'posts', 'update'); // false (no data provided)
```

## Advanced Features

### Wildcards

Use the exported `WILDCARD` constant for permissions that apply to all resources or roles:

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// Admin has all permissions on all resources
Permit.register('admin', WILDCARD, {
  read: true,
  create: true,
  update: true,
  delete: true,
});

// All roles can view posts
Permit.register(WILDCARD, 'posts', {
  read: true,
});

// Specific permissions override wildcards
Permit.register('admin', WILDCARD, { read: true });
Permit.register('admin', 'secrets', { read: false }); // Specific wins
```

### Anonymous Users

Use the `ANONYMOUS` constant for unauthenticated users:

```ts
import { Permit, ANONYMOUS } from '@vielzeug/permit';

// Public read access for unauthenticated users
Permit.register(ANONYMOUS, 'posts', { read: true });

// Malformed users are treated as ANONYMOUS + WILDCARD
const malformedUser = null;
Permit.check(malformedUser, 'posts', 'read'); // true (has ANONYMOUS role)
```

::: warning Security Note
Malformed users (missing `id` or `roles`) automatically receive both `ANONYMOUS` and `WILDCARD` roles. Ensure wildcard permissions are intended for public access.
:::

### Multiple Roles

Users can have multiple roles, and permissions are additive (first-match-wins):

```ts
Permit.register('viewer', 'posts', { read: true });
Permit.register('creator', 'posts', { create: true });

const user = { id: '1', roles: ['viewer', 'creator'] };

// User has permissions from both roles
Permit.check(user, 'posts', 'read'); // true
Permit.check(user, 'posts', 'create'); // true
```

### Setting Permissions

Use `set()` to replace or merge permissions:

```ts
// Merge with existing (default)
Permit.set('editor', 'posts', { read: true, create: true });

// Replace completely
Permit.set('editor', 'posts', { read: true }, true); // Only read remains
```

### Unregistering Permissions

Remove permissions when no longer needed:

```ts
// Remove specific action
Permit.unregister('editor', 'posts', 'delete');

// Remove all actions for a resource
Permit.unregister('editor', 'posts');

// Automatically cleans up empty role/resource entries
```

### Checking User Roles

Use `hasRole()` helper for role checks:

```ts
const user = { id: '1', roles: ['Admin', 'Editor'] };

// Normalized comparison (case-insensitive)
Permit.hasRole(user, 'admin'); // true
Permit.hasRole(user, 'EDITOR'); // true
Permit.hasRole(user, 'moderator'); // false

// For malformed users, only ANONYMOUS role returns true
const malformed = null;
Permit.hasRole(malformed, ANONYMOUS); // true
Permit.hasRole(malformed, 'admin'); // false
```

### Merging Permissions

Registering permissions for the same role/resource merges them:

```ts
Permit.register('editor', 'posts', { read: true, create: true });
Permit.register('editor', 'posts', { update: true }); // Adds to existing

// Editor now has: read, create, and update
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
// Get deep copy of all registered permissions
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
  read: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('moderator', 'users', {
  read: true,
  update: true,
});

Permit.register('user', 'users', {
  read: true,
});
```

### Resource Ownership

```ts
// Users can only modify their own resources
Permit.register('user', 'profile', {
  read: true,
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
  read: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('manager', 'documents', {
  read: true,
  create: true,
  update: (user, doc) => doc.department === user.department,
  delete: (user, doc) => doc.department === user.department,
});

Permit.register('employee', 'documents', {
  read: (user, doc) => doc.department === user.department,
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
      read: perm.canView,
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
    read: true,
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

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> - Complete API documentation</li>
      <li><a href="./examples">Examples</a> - Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> - Try it in your browser</li>
    </ul>
  </div>
</div>
