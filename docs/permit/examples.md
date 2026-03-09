---
title: Permit — Examples
description: Real-world RBAC patterns and framework integrations for Permit.
---

## Permit Examples

::: tip
These are copy-paste ready recipes. See [Usage Guide](./usage.md) for detailed explanations.
:::

[[toc]]

## Blog platform (Read / Write / Admin)

```ts
import { createPermit, ANONYMOUS } from '@vielzeug/permit';

const permit = createPermit<User>();

// Anyone (including guests) can read posts and comments
permit.grant(ANONYMOUS, 'posts', 'read').grant(ANONYMOUS, 'comments', 'read');

// Authors can create and manage their own content
permit
  .register('author', 'posts', {
    create: true,
    read: true,
    update: (user, post) => user.id === post?.authorId,
    delete: (user, post) => user.id === post?.authorId,
  })
  .register('author', 'comments', { create: true, read: true });

// Moderators manage comments
permit.grant('moderator', 'comments', 'read', 'update', 'delete');

// Admins have full access to everything
permit.grant('admin', '*', 'read', 'create', 'update', 'delete');

// --- Usage ---
const guest = { id: '', roles: [] }; // falsy id → anonymous
const author = { id: 'u1', roles: ['author'] };
const admin = { id: 'u2', roles: ['admin'] };

permit.check(guest, 'posts', 'read'); // true
permit.check(author, 'posts', 'create'); // true
permit.check(author, 'posts', 'delete', { authorId: 'u1' }); // true (own post)
permit.check(author, 'posts', 'delete', { authorId: 'u9' }); // false
permit.check(admin, 'anything', 'delete'); // true (wildcard)
```

## SaaS multi-tenant roles

```ts
type User = BaseUser & { tenantId: string };
type Resource = { tenantId: string; ownerId: string };

const permit = createPermit<User>();

permit
  .register('member', 'projects', {
    read: (user, r) => user.tenantId === r?.tenantId,
    create: (user, r) => user.tenantId === r?.tenantId,
    update: (user, r) => user.tenantId === r?.tenantId && user.id === r.ownerId,
  })
  .register('admin', 'projects', {
    read: (user, r) => user.tenantId === r?.tenantId,
    create: (user, r) => user.tenantId === r?.tenantId,
    update: (user, r) => user.tenantId === r?.tenantId,
    delete: (user, r) => user.tenantId === r?.tenantId,
  });
```

## Custom action strings (not just CRUD)

```ts
type CmsAction = 'read' | 'write' | 'publish' | 'archive' | 'request-review';

const permit = createPermit<User, CmsAction>();

permit
  .register('writer', 'articles', {
    read: true,
    write: true,
    'request-review': true,
  })
  .register('editor', 'articles', {
    read: true,
    write: true,
    publish: true,
    archive: true,
  })
  .register('admin', '*', {
    read: true,
    write: true,
    publish: true,
    archive: true,
    'request-review': true,
  });

// TypeScript will error if you check a non-CmsAction string
permit.check(user, 'articles', 'publish'); // ✅
permit.check(user, 'articles', 'delete'); // ❌ TypeScript error
```

## React guard component

```tsx
import { createPermit, type BaseUser } from '@vielzeug/permit';

const permit = createPermit();
permit
  .register('admin', '*', { read: true, write: true, delete: true })
  .register('editor', 'posts', { read: true, write: true });

type Props = {
  user: BaseUser;
  resource: string;
  action: string;
  data?: Record<string, unknown>;
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
</Can>;
```

Or use the bound guard for more granular control:

```tsx
function PostActions({ user, post }) {
  const guard = permit.for(user);
  return (
    <>
      {guard.can('posts', 'write', post) && <EditButton />}
      {guard.can('posts', 'delete', post) && <DeleteButton />}
    </>
  );
}
```

## Express middleware

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();
permit
  .grant('admin', '*', 'read', 'write', 'delete')
  .register('user', 'profile', { read: true, write: (u, d) => u.id === d?.id });

function requirePermission(resource: string, action: string) {
  return (req, res, next) => {
    if (!permit.check(req.user, resource, action, req.body)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.delete('/posts/:id', requirePermission('posts', 'delete'), deleteHandler);
app.put('/profile', requirePermission('profile', 'write'), updateHandler);
```

## Audit logging

```ts
const permit = createPermit({
  logger: (result, user, resource, action, data) => {
    auditLog.write({
      type: result,
      userId: user?.id,
      resource,
      action,
      data,
      ts: Date.now(),
    });
  },
});
```

## Testing with isolated permit instances

```ts
import { createPermit } from '@vielzeug/permit';

describe('Post permissions', () => {
  // Fresh instance per suite — no shared state between tests
  let permit = createPermit();

  beforeEach(() => {
    permit = createPermit();
    permit
      .grant('admin', '*', 'read', 'write', 'delete')
      .register('editor', 'posts', {
        read: true,
        write: (user, data) => user.id === data?.authorId,
      });
  });

  it('admin has full access', () => {
    const admin = { id: 'a1', roles: ['admin'] };
    for (const action of ['read', 'write', 'delete'] as const) {
      expect(permit.check(admin, 'posts', action)).toBe(true);
    }
  });

  it('editor can only write own posts', () => {
    const editor = { id: 'e1', roles: ['editor'] };
    const guard = permit.for(editor);
    expect(guard.can('posts', 'write', { authorId: 'e1' })).toBe(true);
    expect(guard.can('posts', 'write', { authorId: 'other' })).toBe(false);
    expect(guard.can('posts', 'delete')).toBe(false);
  });
});
```
