---
title: 'Permit Examples — Wildcard Action'
description: 'Wildcard Action examples for permit.'
---

## Wildcard Action

## Problem

Implement wildcard action in a production-friendly way with `@vielzeug/permit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/permit` installed.

```ts
import { WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit();
permit.define('admin', 'posts', { [WILDCARD]: true, delete: false });

permit.check({ id: '1', roles: ['admin'] }, 'posts', 'read'); // true
permit.check({ id: '1', roles: ['admin'] }, 'posts', 'delete'); // false
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
