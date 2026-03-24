---
title: 'Permit Examples — Inheritance and Overrides'
description: 'Inheritance and Overrides examples for permit.'
---

## Inheritance and Overrides

## Problem

Implement inheritance and overrides in a production-friendly way with `@vielzeug/permit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/permit` installed.

```ts
import { WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit
  .grant('viewer', WILDCARD, 'read')
  .extend('editor', 'viewer')
  .grant('editor', 'posts', 'write')
  .deny('admin', 'posts', 'write')
  .extend('admin', 'editor');

permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read'); // true
permit.check({ id: '1', roles: ['admin'] }, 'posts', 'write'); // false
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
- [Bound Guard in UI Layer](./bound-guard-in-ui-layer.md)
- [Disabling Wildcard Fallback](./disabling-wildcard-fallback.md)
