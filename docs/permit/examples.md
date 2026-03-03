---
title: Permit — Examples
description: Real-world RBAC patterns and framework integrations for Permit.
---

# Permit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Blog platform (Read / Write / Admin)

```ts
import { createPermit, ANONYMOUS } from '@vielzeug/permit';

const permit = createPermit<User, Post>();

// Readers (anyone)
permit.set(ANONYMOUS, 'posts', { read: true });
permit.set(ANONYMOUS, 'comments', { read: true });

// Authors
permit.set('author', 'posts', {
  create: true,
  read: true,
  update: (user, post) => user.id === post?.authorId,
  delete: (user, post) => user.id === post?.authorId,
});

// Moderators can manage comments
permit.set('moderator', 'comments', { create: true, read: true, update: true, delete: true });

// Admins can do everything
permit.set('admin', '*', { create: true, read: true, update: true, delete: true });

// Usage
const author = { id: 'u1', roles: ['author'] };
const admin  = { id: 'u2', roles: ['admin'] };
const guest  = { id: '',   roles: [] };

permit.check(guest, 'posts', 'read');            // true (anonymous)
permit.check(author, 'posts', 'create');          // true
permit.check(author, 'posts', 'delete', ownPost); // true
permit.check(author, 'posts', 'delete', otherPost); // false
permit.check(admin, 'anything', 'delete');         // true (wildcard)
```

## SaaS multi-tenant roles

```ts
type User = { id: string; roles: string[]; tenantId: string };
type Resource = { tenantId: string; ownerId: string };

const permit = createPermit<User, Resource>();

permit.set('member', 'projects', {
  read: (user, r) => user.tenantId === r?.tenantId,
  create: (user, r) => user.tenantId === r?.tenantId,
  update: (user, r) => user.tenantId === r?.tenantId && user.id === r.ownerId,
});

permit.set('admin', 'projects', {
  read: (user, r) => user.tenantId === r?.tenantId,
  create: (user, r) => user.tenantId === r?.tenantId,
  update: (user, r) => user.tenantId === r?.tenantId,
  delete: (user, r) => user.tenantId === r?.tenantId,
});
```

## React guard component

```tsx
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();
permit.set('admin', '*', { create: true, read: true, update: true, delete: true });
permit.set('editor', 'posts', { read: true, update: true });

type Props = {
  user: User;
  resource: string;
  action: PermissionAction;
  data?: unknown;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

function Can({ user, resource, action, data, children, fallback = null }: Props) {
  if (!permit.check(user, resource, action, data)) return <>{fallback}</>;
  return <>{children}</>;
}

// Usage
<Can user={user} resource="posts" action="delete" data={post}>
  <DeleteButton />
</Can>
```

## Express middleware

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();
permit.set('admin', '*', { create: true, read: true, update: true, delete: true });
permit.set('user', 'profile', { read: true, update: (u, d) => u.id === d?.id });

function requirePermission(resource: string, action: PermissionAction) {
  return (req, res, next) => {
    if (!permit.check(req.user, resource, action, req.body)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.delete('/posts/:id', requirePermission('posts', 'delete'), deleteHandler);
app.put('/profile', requirePermission('profile', 'update'), updateHandler);
```

## Testing with isolated permit instances

```ts
import { createPermit } from '@vielzeug/permit';

describe('Post permissions', () => {
  // Use fresh permit per test suite to prevent state leakage
  let permit = createPermit();

  beforeEach(() => {
    permit = createPermit();
    permit.set('admin', '*', { create: true, read: true, update: true, delete: true });
    permit.set('editor', 'posts', {
      read: true,
      update: (user, data) => user.id === data?.authorId,
    });
  });

  it('admin has full access', () => {
    const admin = { id: 'a1', roles: ['admin'] };
    for (const action of ['create', 'read', 'update', 'delete'] as const) {
      expect(permit.check(admin, 'posts', action)).toBe(true);
    }
  });

  it('editor can only update own posts', () => {
    const editor = { id: 'e1', roles: ['editor'] };
    expect(permit.check(editor, 'posts', 'update', { authorId: 'e1' })).toBe(true);
    expect(permit.check(editor, 'posts', 'update', { authorId: 'other' })).toBe(false);
  });
});
```
