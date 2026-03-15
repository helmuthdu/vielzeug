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
import { createPermit, ANONYMOUS, WILDCARD } from '@vielzeug/permit';

const permit = createPermit<User>();

// Anyone (including guests) can read posts and comments
permit.grant(ANONYMOUS, 'posts', 'read').grant(ANONYMOUS, 'comments', 'read');

// Authors can create and manage their own content
permit
  .define('author', 'posts', {
    create: true,
    read: true,
    update: (user, post) => user.id === post?.authorId,
    delete: (user, post) => user.id === post?.authorId,
  })
  .define('author', 'comments', { create: true, read: true });

// Moderators manage comments
permit.grant('moderator', 'comments', 'read', 'update', 'delete');

// Admins have full access to everything
permit.grant('admin', WILDCARD, 'read', 'create', 'update', 'delete');

// --- Usage ---
const guest = { id: '', roles: [] }; // falsy id → anonymous
const author = { id: 'u1', roles: ['author'] };
const admin = { id: 'u2', roles: ['admin'] };

permit.check(guest, 'posts', 'read'); // true
permit.check(author, 'posts', 'create'); // true
permit.check(author, 'posts', 'delete', { authorId: 'u1' }); // true (own post)
permit.check(author, 'posts', 'delete', { authorId: 'u9' }); // false
permit.check(admin, 'anything', 'delete'); // true (wildcard resource)
```

## Role inheritance

Use `extend()` to build hierarchical roles instead of duplicating grants.

```ts
import { createPermit, WILDCARD } from '@vielzeug/permit';

const permit = createPermit<User>();

// Define the base role once
permit.grant('viewer', WILDCARD, 'read');

// editor inherits everything from viewer, plus write
permit.extend('editor', 'viewer').grant('editor', 'posts', 'write');

// moderator inherits from editor *and* has delete on comments
permit.extend('moderator', 'editor').grant('moderator', 'comments', 'delete');

// admin gets full wildcard access (doesn't need inheritance)
permit.define('admin', WILDCARD, { [WILDCARD]: true });

const viewer = { id: 'v1', roles: ['viewer'] };
const editor = { id: 'e1', roles: ['editor'] };
const moderator = { id: 'm1', roles: ['moderator'] };

permit.check(viewer, 'posts', 'read'); // true  (own grant)
permit.check(viewer, 'posts', 'write'); // false (no write)
permit.check(editor, 'posts', 'read'); // true  (inherited viewer)
permit.check(editor, 'posts', 'write'); // true  (own grant)
permit.check(moderator, 'comments', 'delete'); // true  (own grant)
permit.check(moderator, 'posts', 'write'); // true  (inherited editor → viewer chain)
```

To remove an inheritance relationship later:

```ts
permit.unextend('moderator', 'editor'); // remove one parent
permit.unextend('editor'); // remove ALL parents for editor
```

## Wildcard actions

Grant all actions on a resource with a single `'*'` key:

```ts
import { createPermit, WILDCARD } from '@vielzeug/permit';

const permit = createPermit<User>();

// admin can do anything on any resource
permit.define('admin', WILDCARD, { [WILDCARD]: true });

// superuser can do anything on posts specifically
permit.define('superuser', 'posts', { [WILDCARD]: true });

const admin = { id: 'a1', roles: ['admin'] };
permit.check(admin, 'posts', 'anything'); // true
permit.check(admin, 'billing', 'cancel'); // true
```

## SaaS multi-tenant roles

```ts
type User = BaseUser & { tenantId: string };
type Resource = { tenantId: string; ownerId: string };

const permit = createPermit<User, string, Resource>();

permit
  .define('member', 'projects', {
    read: (user, r) => user.tenantId === r?.tenantId,
    create: (user, r) => user.tenantId === r?.tenantId,
    update: (user, r) => user.tenantId === r?.tenantId && user.id === r.ownerId,
  })
  .define('admin', 'projects', {
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
  .define('writer', 'articles', {
    read: true,
    write: true,
    'request-review': true,
  })
  .define('editor', 'articles', {
    read: true,
    write: true,
    publish: true,
    archive: true,
  });

// TypeScript will error if you check a non-CmsAction string
permit.check(user, 'articles', 'publish'); // ✅
// permit.check(user, 'articles', 'delete'); // ❌ TypeScript error
```

## `checkAll` / `checkAny`

```ts
// All actions must pass
permit.checkAll(user, 'posts', ['read', 'write', 'publish']); // true only if all three pass

// At least one action must pass
permit.checkAny(user, 'posts', ['write', 'delete']); // true if either passes

// Same via the bound guard
const guard = permit.for(user);
guard.canAll('posts', ['read', 'write']);
guard.canAny('posts', ['write', 'delete']);
```

## React guard component

```tsx
import { createPermit, type BaseUser } from '@vielzeug/permit';

const permit = createPermit();
permit
  .define('admin', '*', { read: true, write: true, delete: true })
  .define('editor', 'posts', { read: true, write: true });

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

Or use the bound guard for multiple checks on the same user:

```tsx
function PostActions({ user, post }) {
  const guard = permit.for(user);
  return (
    <>
      {guard.canAny('posts', ['write', 'delete'], post) && <ActionMenu />}
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
  .define('user', 'profile', { read: true, write: (u, d) => u.id === d?.id });

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

## Snapshot and restore

`snapshot()` captures both permissions **and** the role inheritance hierarchy.

```ts
const permit = createPermit();
permit.grant('viewer', '*', 'read');
permit.extend('editor', 'viewer');
permit.grant('editor', 'posts', 'write');

const state = permit.snapshot();
// state = {
//   permissions: { viewer: { '*': { read: true } }, editor: { posts: { write: true } } },
//   hierarchy: { editor: ['viewer'] }
// }

permit.clear(); // wipes permissions + hierarchy

permit.restore(state); // restores everything exactly
permit.check({ id: 'u1', roles: ['editor'] }, 'posts', 'read'); // true (hierarchy re-applied)
```

## Strict mode

Enable strict mode to catch misconfigured permissions at definition time:

```ts
const permit = createPermit({ strict: true });

permit.define('admin', 'posts', {});
// ↑ throws: "Actions map for role 'admin' on resource 'posts' is empty"
```

## Testing with isolated permit instances

```ts
import { createPermit } from '@vielzeug/permit';

describe('Post permissions', () => {
  // Fresh instance per test — no shared state
  let permit = createPermit();

  beforeEach(() => {
    permit = createPermit();
    permit.grant('admin', '*', 'read', 'write', 'delete').define('editor', 'posts', {
      read: true,
      write: (user, data) => user.id === data?.authorId,
    });
  });

  it('admin has full access', () => {
    const admin = { id: 'a1', roles: ['admin'] };
    expect(permit.checkAll(admin, 'posts', ['read', 'write', 'delete'])).toBe(true);
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
