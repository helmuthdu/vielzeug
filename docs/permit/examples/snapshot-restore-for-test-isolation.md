---
title: 'Permit Examples — Snapshot / Restore for Test Isolation'
description: 'Snapshot / Restore for Test Isolation examples for permit.'
---

## Snapshot / Restore for Test Isolation

## Problem

Implement snapshot / restore for test isolation in a production-friendly way with `@vielzeug/permit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/permit` installed.

```ts
const permit = createPermit();
permit.grant('viewer', 'posts', 'read').extend('editor', 'viewer');

const baseline = permit.snapshot();

// mutate in a test
permit.grant('editor', 'posts', 'write');

// reset to baseline
permit.restore(baseline);
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
