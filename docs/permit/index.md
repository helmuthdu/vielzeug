# <img src="/logo-permit.svg" alt="Permit" width="40" style="display: inline-block; vertical-align: middle; margin-right: 10px;"> Permit

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-6.5_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Zero Dependencies">
</div>

**Permit** is a flexible, type-safe permission and role management utility for modern web apps. It provides a simple API for registering, checking, and managing permissions and roles, with support for dynamic rules and full TypeScript support.

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
// Centralized, declarative permission system
Permit.register('admin', 'posts', { edit: true, delete: true });
Permit.register('moderator', 'posts', { 
  edit: (user, post) => post.status === 'pending'
});
Permit.register('author', 'posts', {
  edit: (user, post) => user.id === post.authorId,
  delete: (user, post) => user.id === post.authorId && post.status === 'draft'
});

// Clean, testable permission checks
if (Permit.check(user, 'posts', 'edit', post)) {
  // Edit allowed
}
```

### Comparison with Alternatives

| Feature | Permit | CASL | Casbin | Manual If/Else |
|---------|--------|------|--------|----------------|
| TypeScript Support | ✅ First-class | ✅ Good | ⚠️ Basic | ⚠️ Manual |
| Dynamic Rules | ✅ Simple | ✅ Advanced | ✅ Complex | ✅ Manual |
| Bundle Size (gzip) | ~6.5KB | ~10KB | ~45KB | 0KB |
| Learning Curve | Low | Medium | High | None |
| Role-Based | ✅ | ✅ | ✅ | ⚠️ Manual |
| Resource-Based | ✅ | ✅ | ✅ | ⚠️ Manual |
| Wildcards | ✅ | ✅ | ✅ | ❌ |
| Dependencies | 0 | 5+ | 10+ | N/A |
| Isomorphic | ✅ | ✅ | ✅ | ✅ |

## When to Use Permit

**✅ Use Permit when you:**
- Need role-based access control (RBAC)
- Want type-safe permission checking
- Require dynamic rules based on resource context
- Need centralized permission management
- Want zero dependencies for security
- Build applications with complex authorization logic

**❌ Consider alternatives when you:**
- Need attribute-based access control (ABAC) with complex policies (use CASL/Casbin)
- Require database-backed permission storage
- Need multi-tenancy with isolated permissions
- Simple boolean flags are sufficient

## 🚀 Key Features

- **Role & Resource Based**: Powerful permission model using roles, resources, and actions
- **Dynamic Rules**: Support for functional rules for complex, context-aware permission checks
- **Type-safe**: Built with TypeScript for full autocompletion and type safety
- **Wildcards**: Easily handle broad permissions with wildcard support for roles and resources
- **Zero Dependencies**: Lightweight and fast, perfect for both client and server
- **Isomorphic**: Works everywhere JavaScript runs
- **Simple API**: Easy to learn and integrate into existing applications

## 🏁 Quick Start

### Installation

```sh
# pnpm (recommended)
pnpm add @vielzeug/permit

# npm
npm install @vielzeug/permit

# yarn
yarn add @vielzeug/permit
```

### Basic Setup

```ts
import { Permit } from '@vielzeug/permit';

// 1. Register role-based permissions
Permit.register('admin', 'posts', { 
  view: true, 
  create: true, 
  edit: true,
  delete: true 
});

Permit.register('editor', 'posts', { 
  view: true, 
  create: true,
  edit: true 
});

Permit.register('viewer', 'posts', { 
  view: true 
});

// 2. Check permissions
const user = { id: 'u1', roles: ['editor'] };

if (Permit.check(user, 'posts', 'create')) {
  // User can create posts
}

if (Permit.check(user, 'posts', 'delete')) {
  // This won't run for editor
}
```

### Real-World Example: Blog Platform

```ts
import { Permit } from '@vielzeug/permit';

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
Permit.register('admin', '*', { '*': true }); // Admin has all permissions

Permit.register('editor', 'posts', {
  view: true,
  create: true,
  edit: (user: User, post: Post) => {
    // Editors can edit published posts or drafts
    return post.status === 'draft' || post.status === 'published';
  },
  delete: false
});

Permit.register('author', 'posts', {
  view: true,
  create: true,
  edit: (user: User, post: Post) => {
    // Authors can only edit their own posts
    return user.id === post.authorId;
  },
  delete: (user: User, post: Post) => {
    // Authors can only delete their own drafts
    return user.id === post.authorId && post.status === 'draft';
  }
});

// Use throughout your application
function EditPostButton({ user, post }: { user: User; post: Post }) {
  const canEdit = Permit.check(user, 'posts', 'edit', post);
  
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
Permit.register('admin', 'api', { '*': true });
Permit.register('user', 'api', {
  'GET': true,
  'POST': (user, resource) => resource.isPublic,
  'PUT': (user, resource) => user.id === resource.ownerId,
  'DELETE': false
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
app.post('/api/posts', 
  requirePermission('posts', 'create'),
  async (req, res) => {
    // Create post
  }
);

app.delete('/api/posts/:id',
  requirePermission('posts', 'delete'),
  async (req, res) => {
    // Delete post
  }
);
```

### Framework Integration: React

```tsx
import { Permit } from '@vielzeug/permit';
import { useAuth } from './auth-context';

function ProtectedAction({ 
  resource, 
  action, 
  children,
  fallback = null 
}: {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  
  if (!Permit.check(user, resource, action)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Usage
function PostActions({ post }: { post: Post }) {
  return (
    <div>
      <ProtectedAction resource="posts" action="edit">
        <button>Edit</button>
      </ProtectedAction>
      
      <ProtectedAction resource="posts" action="delete">
        <button>Delete</button>
      </ProtectedAction>
    </div>
  );
}
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Installation, configuration, and basic concepts
- **[API Reference](./api.md)**: Detailed documentation of all methods and types
- **[Examples](./examples.md)**: Advanced patterns for dynamic rules and wildcards

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
  edit: (user, project) => project.managerId === user.id
});
```

### How do wildcards work?

Use `*` for "any" resource or action:

```ts
Permit.register('admin', '*', { '*': true }); // All permissions
Permit.register('moderator', 'comments', { '*': true }); // All comment actions
```

### Is Permit production-ready?

Yes! Permit is used in production applications with comprehensive test coverage.

### How do I test permissions?

Permissions are easy to test:

```ts
describe('Permissions', () => {
  it('allows editors to edit posts', () => {
    const user = { roles: ['editor'] };
    expect(Permit.check(user, 'posts', 'edit')).toBe(true);
  });
});
```

### Can I store permissions in a database?

Yes! Load permissions from your database on app startup:

```ts
const permissions = await fetchPermissionsFromDB();
permissions.forEach(perm => {
  Permit.register(perm.role, perm.resource, perm.actions);
});
```

## 🐛 Troubleshooting

### Permission check always returns false

**Problem**: `Permit.check()` returns false unexpectedly.

**Solution**: Ensure permissions are registered before checking:

```ts
// ✅ Register first
Permit.register('user', 'posts', { view: true });

// Then check
const canView = Permit.check(user, 'posts', 'view');
```

### TypeScript errors with dynamic rules

**Problem**: Type errors in permission functions.

**Solution**: Type your permission functions:

```ts
interface User { id: string; roles: string[]; }
interface Post { authorId: string; }

Permit.register('author', 'posts', {
  edit: (user: User, post: Post) => user.id === post.authorId
});
```

### Wildcards not working

**Problem**: Wildcard permissions not being recognized.

**Solution**: Ensure wildcard syntax is correct:

```ts
// ✅ Correct
Permit.register('admin', '*', { '*': true });

// ❌ Wrong
Permit.register('admin', 'all', { 'all': true });
```

### User has multiple roles but permissions don't combine

**Problem**: User with multiple roles doesn't have expected permissions.

**Solution**: This is expected behavior. If ANY role allows the action, permission is granted. Check that roles are properly registered:

```ts
const user = { roles: ['editor', 'viewer'] };

// User should have permissions from BOTH roles
console.log(Permit.check(user, 'posts', 'view')); // true if either role allows
```

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Duarte](https://github.com/helmuthdu)

---

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/permit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/permit/CHANGELOG.md)

---

> **Tip:** Permit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for storage, HTTP clients, logging, and more.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

