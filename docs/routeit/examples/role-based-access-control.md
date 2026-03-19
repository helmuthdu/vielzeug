---
title: 'Routeit Examples — Role-based Access Control'
description: 'Role-based Access Control examples for routeit.'
---

## Role-based Access Control

## Problem

Implement role-based access control in a production-friendly way with `@vielzeug/routeit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/routeit` installed.

Using `@vielzeug/permit` for fine-grained permissions:

```ts
import { createRouter } from '@vielzeug/routeit';
import { createPermit } from '@vielzeug/permit';
import type { Middleware } from '@vielzeug/routeit';
import type { BaseUser, PermissionAction } from '@vielzeug/permit';

const permit = createPermit();

permit.set('admin', 'posts', { read: true, create: true, update: true, delete: true });
permit.set('editor', 'posts', {
  read: true,
  create: true,
  update: (user, data) => user.id === data.authorId,
  delete: false,
});

const router = createRouter();

const requireAuth: Middleware = async (ctx, next) => {
  const user = await getCurrentUser();
  if (!user) {
    await ctx.navigate('/login');
    return;
  }
  ctx.locals.user = user;
  await next();
};

const requirePermission =
  (resource: string, action: PermissionAction): Middleware =>
  async (ctx, next) => {
    const user = ctx.locals.user as BaseUser;
    if (!permit.check(user, resource, action)) {
      await ctx.navigate('/forbidden');
      return;
    }
    await next();
  };

router
  .on('/posts', renderPosts, { middleware: [requireAuth, requirePermission('posts', 'read')] })
  .on('/posts/new', renderNewPost, { middleware: [requireAuth, requirePermission('posts', 'create')] })
  .on('/posts/:id/edit', ({ params }) => renderEditPost(params.id), {
    middleware: [requireAuth, requirePermission('posts', 'update')],
  })
  .start();
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [autoStart](./autostart.md)
- [Base Path Deployment](./base-path-deployment.md)
