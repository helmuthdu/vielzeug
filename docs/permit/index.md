<PackageBadges package="permit" />

<img src="/logo-permit.svg" alt="Permit Logo" width="156" class="logo-highlight"/>

# Permit

**Permit** is a flexible, type-safe role-based access control (RBAC) system for modern web applications. It provides a simple yet powerful API for managing permissions with support for dynamic rules, wildcards, normalization, and full TypeScript support.

## What Problem Does Permit Solve?

Managing permissions with manual `if/else` chains becomes unmaintainable as your app grows. You need a centralized, declarative system that's easy to audit, test, and extend.

**Without Permit**:

```ts
// Scattered, hard-to-maintain permission logic
function canEditPost(user: User, post: Post): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'moderator' && post.status === 'pending') return true;
  if (user.id === post.authorId) return true;
  return false;
}

function canDeletePost(user: User, post: Post): boolean {
  if (user.role === 'admin') return true;
  if (user.id === post.authorId && post.status === 'draft') return true;
  return false;
}

// Duplicated logic, hard to test, error-prone
```

**With Permit**:

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// Centralized, declarative permission system
Permit.register('admin', 'posts', {
  read: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('moderator', 'posts', {
  update: (user, post) => post.status === 'pending',
});

Permit.register('author', 'posts', {
  update: (user, post) => user.id === post.authorId,
  delete: (user, post) => user.id === post.authorId && post.status === 'draft',
});

// Clean, testable permission checks
if (Permit.check(user, 'posts', 'update', post)) {
  // Update allowed
}
```

### Comparison with Alternatives

| Feature            | Permit                                               | CASL        | Casbin     | Manual If/Else |
| ------------------ | ---------------------------------------------------- | ----------- | ---------- | -------------- |
| TypeScript Support | ✅ First-class                                       | ✅ Good     | ⚠️ Basic   | ⚠️ Manual      |
| Dynamic Rules      | ✅ Simple                                            | ✅ Advanced | ✅ Complex | ✅ Manual      |
| Bundle Size (gzip) | **<PackageInfo package="permit" type="size" />**     | ~15KB       | ~45KB      | 0KB            |
| Learning Curve     | Low                                                  | Medium      | High       | None           |
| Role-Based         | ✅                                                   | ✅          | ✅         | ⚠️ Manual      |
| Resource-Based     | ✅                                                   | ✅          | ✅         | ⚠️ Manual      |
| Wildcards          | ✅ Role + Resource                                   | ⚠️ Limited  | ✅         | ❌             |
| Normalization      | ✅ Built-in                                          | ❌          | ❌         | ❌             |
| Security Defaults  | ✅ Safe                                              | ⚠️          | ⚠️         | ❌             |
| Type Exports       | ✅ All                                               | ⚠️ Some     | ❌         | N/A            |
| Dependencies       | <PackageInfo package="permit" type="dependencies" /> | 5+          | 10+        | N/A            |
| Isomorphic         | ✅                                                   | ✅          | ✅         | ✅             |

## When to Use Permit

**✅ Use Permit when you:**

- Need role-based access control (RBAC)
- Want type-safe permission checking
- Require dynamic rules based on resource context
- Need centralized permission management
- Want minimal dependencies for security
- Build applications with complex authorization logic
- Need case-insensitive permission matching
- Want safe handling of unauthenticated users

**❌ Consider alternatives when you:**

- Need attribute-based access control (ABAC) with complex policies (use CASL/Casbin)
- Require database-backed permission storage
- Need multi-tenancy with isolated permissions
- Simple boolean flags are sufficient

## 🚀 Key Features

- **Deep Copy Protection**: Immutable [permission registry inspection](./usage.md#inspecting-permissions)
- **Dynamic Rules**: Support for [functional rules](./usage.md#dynamic-permissions) for complex, context-aware permission checks
- **Flexible API**: Register, set, unregister, and check permissions with ease. See [Basic Usage](./usage.md#basic-usage).
- **Lightweight & Fast**: <PackageInfo package="permit" type="dependencies" /> dependency and only **<PackageInfo package="permit" type="size" /> gzipped**.
- **Normalized Matching**: Case-insensitive, trimmed role/resource comparison prevents mismatches
- **Role & Resource Based**: [Powerful permission model](./usage.md#registering-permissions) using roles, resources, and actions.
- **Runtime Validation**: Validates permission actions at registration
- **Security-First**: Safe handling of malformed users with [ANONYMOUS role](./usage.md#anonymous-users)
- **Type-safe**: Built with TypeScript for [full autocompletion and type safety](./usage.md#typescript-generics).
- **Wildcard Support**: Define permissions for [all roles or all resources](./usage.md#wildcards)

## 🏁 Quick Start

### Installation

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

### Basic Setup

```ts
import { Permit, WILDCARD, ANONYMOUS } from '@vielzeug/permit';

// 1. Register role-based permissions
Permit.register('admin', 'posts', {
  read: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('editor', 'posts', {
  read: true,
  create: true,
  update: true,
});

Permit.register('viewer', 'posts', {
  read: true,
});

// 2. Public permissions for unauthenticated users
Permit.register(ANONYMOUS, 'posts', {
  read: true,
});

// 3. Check permissions
const user = { id: 'u1', roles: ['editor'] };

if (Permit.check(user, 'posts', 'create')) {
  // User can create posts
}

if (Permit.check(user, 'posts', 'delete')) {
  // This won't run for editor
}

// 4. Normalization – case-insensitive matching
Permit.register('Admin', 'Posts', { read: true });
const adminUser = { id: 'u2', roles: ['ADMIN'] };
Permit.check(adminUser, 'posts', 'read'); // true
```

### Real-World Example: Blog Platform

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

interface User {
  id: string;
  roles: string[];
}

interface Post {
  id: string;
  authorId: string;
  status: 'draft' | 'published' | 'archived';
}

// Define permission rules
Permit.register('admin', WILDCARD, {
  read: true,
  create: true,
  update: true,
  delete: true
}); // Admin has all permissions on all resources

Permit.register('editor', 'posts', {
  read: true,
  create: true,
  update: (user: User, post: Post) => {
    // Editors can update published posts or drafts
    return post.status === 'draft' || post.status === 'published';
  },
  delete: false
});

Permit.register('author', 'posts', {
  read: true,
  create: true,
  update: (user: User, post: Post) => {
    // Authors can only update their own posts
    return user.id === post.authorId;
  },
  delete: (user: User, post: Post) => {
    // Authors can only delete their own drafts
    return user.id === post.authorId && post.status === 'draft';
  }
});

// Use throughout your application
function EditPostButton({ user, post }: { user: User; post: Post }) {
  const canEdit = Permit.check(user, 'posts', 'update', post);

  if (!canEdit) return null;

  return <button onClick={() => editPost(post)}>Edit</button>;
}

function deletePost(user: User, post: Post) {
  if (!Permit.check(user, 'posts', 'delete', post)) {
    throw new Error('Permission denied');
  }

  // Proceed with deletion
}
```

### Framework Integration: Express API

```ts
import express from 'express';
import { Permit } from '@vielzeug/permit';

// Setup permissions
Permit.register('admin', 'posts', {
  read: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('user', 'posts', {
  read: true,
  create: true,
  update: (user, post) => user.id === post.authorId,
  delete: (user, post) => user.id === post.authorId,
});

// Middleware
function requirePermission(resource: string, action: string) {
  return (req, res, next) => {
    const user = req.user; // From auth middleware

    if (!Permit.check(user, resource, action, req.body)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
}

// Protected routes
app.post('/api/posts', requirePermission('posts', 'create'), async (req, res) => {
  // Create post
});

app.delete('/api/posts/:id', requirePermission('posts', 'delete'), async (req, res) => {
  // Delete post
});
```

### Framework Integration: React

```tsx
import { Permit } from '@vielzeug/permit';
import { useAuth } from './auth-context';

function ProtectedAction({
  resource,
  action,
  data,
  children,
  fallback = null,
}: {
  resource: string;
  action: string;
  data?: any;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!Permit.check(user, resource, action, data)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Usage
function PostActions({ post }: { post: Post }) {
  return (
    <div>
      <ProtectedAction resource="posts" action="update" data={post}>
        <button>Edit</button>
      </ProtectedAction>

      <ProtectedAction resource="posts" action="delete" data={post}>
        <button>Delete</button>
      </ProtectedAction>
    </div>
  );
}
```

## 🎓 Core Concepts

### Roles

Users can have one or more roles that grant permissions:

```ts
const user = { roles: ['admin', 'moderator'] };
```

### Resources

The entities or features being protected:

```ts
Permit.register('user', 'posts', { create: true, read: true });
//                       ^^^^^^ resource
```

### Actions

The operations that can be performed on resources:

- **create**: Create new items
- **read**: Read/view items
- **update**: Modify existing items
- **delete**: Remove items

### Permission Types

Three ways to define permissions:

1. **Boolean**: Simple true/false
2. **Function**: Dynamic checks with data
3. **Wildcard**: `*` grants all permissions

### Wildcards

Special roles and resources:

- **WILDCARD role (`*`)**: Matches any role (public permissions)
- **WILDCARD resource (`*`)**: Applies to all resources

```ts
Permit.register('*', 'posts', { read: true }); // Anyone can view posts
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Installation, configuration, and basic concepts
- **[API Reference](./api.md)**: Detailed documentation of all methods and types
- **[Examples](./examples.md)**: Advanced patterns for dynamic rules and wildcards
- **[Interactive REPL](/repl)**: Try it in your browser

## ❓ FAQ

### How do I handle multi-role users?

Users can have multiple roles. Permit checks all roles and grants access if ANY role allows the action:

```ts
const user = { roles: ['editor', 'viewer'] };
// Has permissions from both roles
```

### Can I use dynamic permissions?

Yes! Use function-based rules:

```ts
Permit.register('manager', 'projects', {
  update: (user, project) => project.managerId === user.id,
});
```

### How do wildcards work?

::: tip Wildcard Constant
Use the exported `WILDCARD` constant (value: `'*'`) for "any" resource or all permissions.
:::

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// Admin has all permissions on all resources
Permit.register('admin', WILDCARD, {
  read: true,
  create: true,
  update: true,
  delete: true,
});

// Moderator has all permissions on comments
Permit.register('moderator', 'comments', {
  read: true,
  create: true,
  update: true,
  delete: true,
});
```

### Is Permit production-ready?

Yes! Permit is used in production applications with comprehensive test coverage.

### How do I test permissions?

Permissions are easy to test:

```ts
import { Permit } from '@vielzeug/permit';

describe('Permissions', () => {
  beforeEach(() => {
    Permit.clear(); // Clear permissions before each test
  });

  it('allows editors to update posts', () => {
    Permit.register('editor', 'posts', { update: true });
    const user = { id: '1', roles: ['editor'] };
    expect(Permit.check(user, 'posts', 'update')).toBe(true);
  });

  it('denies editors from deleting posts', () => {
    Permit.register('editor', 'posts', { update: true });
    const user = { id: '1', roles: ['editor'] };
    expect(Permit.check(user, 'posts', 'delete')).toBe(false);
  });
});
```

### Can I store permissions in a database?

Yes! Load permissions from your database on app startup:

```ts
const permissions = await fetchPermissionsFromDB();
permissions.forEach((perm) => {
  Permit.register(perm.role, perm.resource, perm.actions);
});
```

## 🐛 Troubleshooting

### Permission check always returns false

::: danger Problem
`Permit.check()` returns false unexpectedly.
:::

::: tip Solution
Ensure permissions are registered before checking:

```ts
// ✅ Register first
Permit.register('user', 'posts', { read: true });

// Then check
const canView = Permit.check(user, 'posts', 'read');
```

:::

### TypeScript errors with dynamic rules

::: danger Problem
Type errors in permission functions.
:::

::: tip Solution
Type your permission functions properly:

```ts
interface User {
  id: string;
  roles: string[];
}
interface Post {
  authorId: string;
}

Permit.register<User, Post>('author', 'posts', {
  update: (user: User, post: Post) => user.id === post.authorId,
});
```

:::

### Wildcards not working

::: danger Problem
Wildcard permissions not being recognized.
:::

::: tip Solution
Import and use the WILDCARD constant:

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// ✅ Correct
Permit.register('admin', WILDCARD, {
  read: true,
  create: true,
  update: true,
  delete: true,
});

// ❌ Wrong – don't use string literals for actions
Permit.register('admin', '*', { all: true });
```

:::

### User has multiple roles but permissions don't combine

**Problem**: User with multiple roles doesn't have expected permissions.

**Solution**: This is expected behavior. If ANY role allows the action, permission is granted. Check that roles are properly registered:

```ts
const user = { roles: ['editor', 'viewer'] };

// User should have permissions from BOTH roles
console.log(Permit.check(user, 'posts', 'read')); // true if either role allows
```

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/permit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/permit/CHANGELOG.md)

---

> **Tip:** Permit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for storage, HTTP clients, logging, and more.
