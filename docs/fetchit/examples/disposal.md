---
title: 'Fetchit Examples — Disposal'
description: 'Disposal examples for fetchit.'
---

## Disposal

## Problem

Implement disposal in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

```ts
// Using declarations (TypeScript 5.2+)
{
  using api = createApi({ baseUrl: 'https://api.example.com' });
  using qc = createQuery();
  // Automatically disposed at end of block
}

// Manual disposal — good for singleton cleanup on logout
function cleanup() {
  api.dispose();
  qc.dispose();
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

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Error Handling Patterns](./error-handling-patterns.md)
