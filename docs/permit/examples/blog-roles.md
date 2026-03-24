---
title: 'Permit Examples — Blog Roles'
description: 'Blog Roles examples for permit.'
---

## Blog Roles

## Problem

Implement blog roles in a production-friendly way with `@vielzeug/permit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/permit` installed.

```ts
import { ANONYMOUS, WILDCARD, createPermit } from '@vielzeug/permit';

type User = { id: string; roles: string[] };
type Post = { authorId: string };

const permit = createPermit<User, string, Post>();

permit
  .grant(ANONYMOUS, 'posts', 'read')
  .define('author', 'posts', {
    create: true,
    read: true,
    update: (user, post) => user.id === post?.authorId,
    delete: (user, post) => user.id === post?.authorId,
  })
  .grant('admin', WILDCARD, 'read', 'create', 'update', 'delete');
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Bound Guard in UI Layer](./bound-guard-in-ui-layer.md)
- [Disabling Wildcard Fallback](./disabling-wildcard-fallback.md)
- [Inheritance and Overrides](./inheritance-and-overrides.md)
