# Permit Examples

Practical examples showing common use cases and patterns.

::: tip 💡 Complete Applications
These are complete application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Basic Operations

### Simple Permission Registration

```ts
import { Permit } from '@vielzeug/permit';

// Register static permissions
Permit.register('admin', 'posts', {
  view: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('editor', 'posts', {
  view: true,
  create: true,
  update: true,
});

Permit.register('viewer', 'posts', {
  view: true,
});

// Check permissions
const admin = { id: '1', roles: ['admin'] };
const editor = { id: '2', roles: ['editor'] };
const viewer = { id: '3', roles: ['viewer'] };

Permit.check(admin, 'posts', 'delete'); // true
Permit.check(editor, 'posts', 'delete'); // false
Permit.check(viewer, 'posts', 'create'); // false
```

### Dynamic Permission Functions

```ts
interface User extends BaseUser {
  id: string;
  roles: string[];
  department: string;
}

interface Post {
  id: string;
  authorId: string;
  status: 'draft' | 'published' | 'archived';
  department: string;
}

// Author can only update their own posts
Permit.register<User, Post>('author', 'posts', {
  view: true,
  create: true,
  update: (user, post) => user.id === post.authorId,
  delete: (user, post) => {
    return user.id === post.authorId && post.status === 'draft';
  },
});

const author = { id: 'u1', roles: ['author'], department: 'tech' };
const ownPost = { id: 'p1', authorId: 'u1', status: 'draft', department: 'tech' };
const othersPost = { id: 'p2', authorId: 'u2', status: 'draft', department: 'tech' };

Permit.check(author, 'posts', 'update', ownPost); // true
Permit.check(author, 'posts', 'update', othersPost); // false
Permit.check(author, 'posts', 'delete', ownPost); // true
```

### Multiple Roles

```ts
// User with multiple roles
Permit.register('viewer', 'posts', { view: true });
Permit.register('creator', 'posts', { create: true });
Permit.register('moderator', 'comments', { delete: true });

const user = {
  id: 'u1',
  roles: ['viewer', 'creator', 'moderator'],
};

// Has permissions from all roles
Permit.check(user, 'posts', 'view'); // true (from viewer)
Permit.check(user, 'posts', 'create'); // true (from creator)
Permit.check(user, 'comments', 'delete'); // true (from moderator)
Permit.check(user, 'posts', 'delete'); // false (no role grants this)
```

## Wildcard Patterns

### Admin with All Permissions

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// Admin has all permissions on all resources
Permit.register('admin', WILDCARD, {
  view: true,
  create: true,
  update: true,
  delete: true,
});

const admin = { id: 'admin1', roles: ['admin'] };

// Admin can do everything
Permit.check(admin, 'posts', 'delete'); // true
Permit.check(admin, 'users', 'create'); // true
Permit.check(admin, 'settings', 'update'); // true
```

### Universal View Access

```ts
import { Permit, WILDCARD } from '@vielzeug/permit';

// All roles can view posts
Permit.register(WILDCARD, 'posts', { view: true });

const guest = { id: 'g1', roles: ['guest'] };
const user = { id: 'u1', roles: ['user'] };

// Everyone can view
Permit.check(guest, 'posts', 'view'); // true
Permit.check(user, 'posts', 'view'); // true
```

### Moderator with Full Resource Access

```ts
// Moderator has all permissions on comments
Permit.register('moderator', 'comments', {
  view: true,
  create: true,
  update: true,
  delete: true,
});

const mod = { id: 'm1', roles: ['moderator'] };

// Can do anything with comments
Permit.check(mod, 'comments', 'delete'); // true
Permit.check(mod, 'comments', 'create'); // true
```

## Real-World Scenarios

::: warning 🔒 Security Considerations

- Always validate permissions on the server-side
- Client-side checks are for UX only (hiding buttons, etc.)
- Never trust permissions stored in client storage
- Implement permission caching carefully to avoid stale data
- Re-validate permissions after critical operations
  :::

### Blog Platform

```ts
interface User extends BaseUser {
  id: string;
  roles: string[];
  email: string;
}

interface Post {
  id: string;
  authorId: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private';
}

// Setup permissions
Permit.register('admin', WILDCARD, {
  view: true,
  create: true,
  update: true,
  delete: true,
});

Permit.register('editor', 'posts', {
  view: true,
  create: true,
  update: (user, post) => {
    // Editors can update any non-archived post
    return post.status !== 'archived';
  },
  delete: false,
});

Permit.register('author', 'posts', {
  view: true,
  create: true,
  update: (user, post) => {
    // Authors can only update their own posts
    return user.id === post.authorId;
  },
  delete: (user, post) => {
    // Authors can only delete their own drafts
    return user.id === post.authorId && post.status === 'draft';
  },
});

Permit.register(WILDCARD, 'posts', {
  view: (user, post) => {
    // Everyone can view public posts
    return post.visibility === 'public';
  },
});

// Usage
const editor = { id: 'e1', roles: ['editor'], email: 'editor@example.com' };
const author = { id: 'a1', roles: ['author'], email: 'author@example.com' };

const publishedPost = {
  id: 'p1',
  authorId: 'a1',
  status: 'published',
  visibility: 'public',
};

const draftPost = {
  id: 'p2',
  authorId: 'a1',
  status: 'draft',
  visibility: 'private',
};

Permit.check(editor, 'posts', 'update', publishedPost); // true
Permit.check(author, 'posts', 'delete', publishedPost); // false (not draft)
Permit.check(author, 'posts', 'delete', draftPost); // true
```

### E-Commerce System

```ts
interface User extends BaseUser {
  id: string;
  roles: string[];
  isVerified: boolean;
}

interface Order {
  id: string;
  customerId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  total: number;
}

Permit.register('customer', 'orders', {
  view: (user, order) => user.id === order.customerId,
  create: (user) => user.isVerified,
  update: (user, order) => {
    return user.id === order.customerId && order.status === 'pending';
  },
  delete: (user, order) => {
    return user.id === order.customerId && order.status === 'pending';
  },
});

Permit.register('support', 'orders', {
  view: true,
  update: (user, order) => {
    // Support can update orders up until shipped
    return order.status === 'pending' || order.status === 'processing';
  },
});

Permit.register('admin', 'orders', {
  view: true,
  create: true,
  update: true,
  delete: true,
});

// Usage
const customer = { id: 'c1', roles: ['customer'], isVerified: true };
const pendingOrder = {
  id: 'o1',
  customerId: 'c1',
  status: 'pending',
  total: 99.99,
};

Permit.check(customer, 'orders', 'update', pendingOrder); // true
Permit.check(customer, 'orders', 'create'); // true (verified)
```

### Multi-Tenant SaaS

```ts
interface User extends BaseUser {
  id: string;
  roles: string[];
  organizationId: string;
}

interface Document {
  id: string;
  organizationId: string;
  ownerId: string;
  shared: boolean;
}

Permit.register('org-admin', 'documents', {
  view: (user, doc) => user.organizationId === doc.organizationId,
  create: (user, doc) => user.organizationId === doc.organizationId,
  update: (user, doc) => user.organizationId === doc.organizationId,
  delete: (user, doc) => user.organizationId === doc.organizationId,
});

Permit.register('org-member', 'documents', {
  view: (user, doc) => {
    return user.organizationId === doc.organizationId && (doc.shared || doc.ownerId === user.id);
  },
  create: (user, doc) => user.organizationId === doc.organizationId,
  update: (user, doc) => {
    return user.organizationId === doc.organizationId && doc.ownerId === user.id;
  },
  delete: (user, doc) => {
    return user.organizationId === doc.organizationId && doc.ownerId === user.id;
  },
});

const member = { id: 'u1', roles: ['org-member'], organizationId: 'org1' };
const sharedDoc = {
  id: 'd1',
  organizationId: 'org1',
  ownerId: 'u2',
  shared: true,
};

Permit.check(member, 'documents', 'view', sharedDoc); // true (shared)
Permit.check(member, 'documents', 'update', sharedDoc); // false (not owner)
```

## Framework Integration

### React Component

```tsx
import { Permit } from '@vielzeug/permit';
import { useAuth } from './auth-context';
import { ReactNode } from 'react';

interface ProtectedProps {
  resource: string;
  action: string;
  data?: any;
  children: ReactNode;
  fallback?: ReactNode;
}

function Protected({ resource, action, data, children, fallback = null }: ProtectedProps) {
  const { user } = useAuth();

  if (!Permit.check(user, resource, action, data)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Usage
function PostCard({ post }) {
  return (
    <div>
      <h2>{post.title}</h2>
      <p>{post.content}</p>

      <Protected resource="posts" action="update" data={post}>
        <button>Edit</button>
      </Protected>

      <Protected resource="posts" action="delete" data={post} fallback={<span>Delete not allowed</span>}>
        <button>Delete</button>
      </Protected>
    </div>
  );
}
```

### React Hook

```tsx
import { Permit } from '@vielzeug/permit';
import { useAuth } from './auth-context';

function usePermission(resource: string, action: string, data?: any) {
  const { user } = useAuth();
  return Permit.check(user, resource, action, data);
}

// Usage
function EditButton({ post }) {
  const canEdit = usePermission('posts', 'update', post);

  if (!canEdit) return null;

  return <button onClick={() => handleEdit(post)}>Edit</button>;
}
```

### Express Middleware

```ts
import express from 'express';
import { Permit } from '@vielzeug/permit';

// Authorization middleware
function authorize(resource: string, action: string) {
  return (req, res, next) => {
    const user = req.user; // From authentication middleware

    // Extract data from request (body, params, query)
    const data = req.body;

    if (!Permit.check(user, resource, action, data)) {
      return res.status(403).json({
        error: 'Permission denied',
        message: `User lacks ${action} permission on ${resource}`,
      });
    }

    next();
  };
}

// Setup routes
const app = express();

app.get('/api/posts', authenticate, authorize('posts', 'view'), async (req, res) => {
  const posts = await db.posts.findAll();
  res.json(posts);
});

app.post('/api/posts', authenticate, authorize('posts', 'create'), async (req, res) => {
  const post = await db.posts.create(req.body);
  res.json(post);
});

app.put('/api/posts/:id', authenticate, authorize('posts', 'update'), async (req, res) => {
  const post = await db.posts.update(req.params.id, req.body);
  res.json(post);
});

app.delete('/api/posts/:id', authenticate, authorize('posts', 'delete'), async (req, res) => {
  await db.posts.delete(req.params.id);
  res.status(204).send();
});
```

### Vue Composable

```ts
import { computed, Ref } from 'vue';
import { Permit } from '@vielzeug/permit';
import { useAuth } from './auth';

export function usePermission(resource: string, action: string, data?: Ref<any>) {
  const { user } = useAuth();

  return computed(() => {
    return Permit.check(user.value, resource, action, data?.value);
  });
}

// Usage in component
export default {
  setup() {
    const { user } = useAuth();
    const post = ref({ id: '1', authorId: user.value.id });

    const canEdit = usePermission('posts', 'update', post);
    const canDelete = usePermission('posts', 'delete', post);

    return { canEdit, canDelete };
  },
};
```

## Testing

### Unit Tests

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Permit } from '@vielzeug/permit';

describe('Post Permissions', () => {
  beforeEach(() => {
    Permit.clear(); // Clear before each test
  });

  it('allows admin to delete any post', () => {
    Permit.register('admin', 'posts', { delete: true });

    const admin = { id: 'a1', roles: ['admin'] };
    const post = { id: 'p1', authorId: 'someone-else' };

    expect(Permit.check(admin, 'posts', 'delete', post)).toBe(true);
  });

  it('allows author to delete only their own drafts', () => {
    Permit.register('author', 'posts', {
      delete: (user, post) => {
        return user.id === post.authorId && post.status === 'draft';
      },
    });

    const author = { id: 'a1', roles: ['author'] };
    const ownDraft = { id: 'p1', authorId: 'a1', status: 'draft' };
    const ownPublished = { id: 'p2', authorId: 'a1', status: 'published' };
    const othersDraft = { id: 'p3', authorId: 'a2', status: 'draft' };

    expect(Permit.check(author, 'posts', 'delete', ownDraft)).toBe(true);
    expect(Permit.check(author, 'posts', 'delete', ownPublished)).toBe(false);
    expect(Permit.check(author, 'posts', 'delete', othersDraft)).toBe(false);
  });

  it('denies viewer from creating posts', () => {
    Permit.register('viewer', 'posts', { view: true });

    const viewer = { id: 'v1', roles: ['viewer'] };

    expect(Permit.check(viewer, 'posts', 'create')).toBe(false);
  });

  it('combines permissions from multiple roles', () => {
    Permit.register('viewer', 'posts', { view: true });
    Permit.register('creator', 'posts', { create: true });

    const user = { id: 'u1', roles: ['viewer', 'creator'] };

    expect(Permit.check(user, 'posts', 'view')).toBe(true);
    expect(Permit.check(user, 'posts', 'create')).toBe(true);
    expect(Permit.check(user, 'posts', 'delete')).toBe(false);
  });
});
```

### Integration Tests

```ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Permit } from '@vielzeug/permit';
import { setupTestApp } from './test-helpers';

describe('API Authorization', () => {
  let app;

  beforeAll(() => {
    app = setupTestApp();
  });

  beforeEach(() => {
    Permit.clear();
    Permit.register('admin', 'posts', {
      view: true,
      create: true,
      update: true,
      delete: true,
    });
  });

  it('allows admin to delete posts', async () => {
    const admin = { id: 'a1', roles: ['admin'], token: 'admin-token' };

    const response = await app.delete('/api/posts/1').set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(204);
  });

  it('denies non-admin from deleting posts', async () => {
    const user = { id: 'u1', roles: ['user'], token: 'user-token' };

    const response = await app.delete('/api/posts/1').set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(403);
  });
});
```

## Advanced Patterns

### Permission Caching

```ts
// Cache permission checks for performance
class PermissionCache {
  private cache = new Map<string, boolean>();

  check(user: BaseUser, resource: string, action: string, data?: any): boolean {
    const key = this.getCacheKey(user, resource, action, data);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const result = Permit.check(user, resource, action, data);
    this.cache.set(key, result);

    return result;
  }

  private getCacheKey(user: BaseUser, resource: string, action: string, data?: any): string {
    const dataKey = data ? JSON.stringify(data) : '';
    return `${user.id}-${resource}-${action}-${dataKey}`;
  }

  clear() {
    this.cache.clear();
  }
}

const permCache = new PermissionCache();

// Use cached checks
const canEdit = permCache.check(user, 'posts', 'update', post);
```

### Loading from Database

```ts
async function initializePermissions() {
  const permissions = await db.query(`
    SELECT role, resource, view, create, update, delete 
    FROM permissions
  `);

  for (const perm of permissions) {
    Permit.register(perm.role, perm.resource, {
      view: perm.view,
      create: perm.create,
      update: perm.update,
      delete: perm.delete,
    });
  }
}

// Call on app startup
await initializePermissions();
```

### Audit Logging

```ts
function checkWithAudit(user: BaseUser, resource: string, action: string, data?: any): boolean {
  const allowed = Permit.check(user, resource, action, data);

  // Log the permission check
  auditLog.log({
    timestamp: new Date(),
    userId: user.id,
    resource,
    action,
    allowed,
    data,
  });

  return allowed;
}
```
