---
title: 'Permit Examples — Bound Guard in UI Layer'
description: 'Bound Guard in UI Layer examples for permit.'
---

## Bound Guard in UI Layer

## Problem

Implement bound guard in ui layer in a production-friendly way with `@vielzeug/permit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/permit` installed.

```ts
const permit = createPermit().grant('editor', 'posts', 'read', 'write').grant('admin', '*', 'delete');

const user = { id: 'u1', roles: ['editor'] };
const guard = permit.for(user);

if (guard.can('posts', 'write')) {
  // show edit button
}

if (guard.canAny('posts', ['write', 'delete'])) {
  // show actions menu
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Blog Roles](./blog-roles.md)
- [Disabling Wildcard Fallback](./disabling-wildcard-fallback.md)
- [Inheritance and Overrides](./inheritance-and-overrides.md)
