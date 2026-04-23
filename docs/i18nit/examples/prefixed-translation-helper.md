---
title: 'I18nit Examples — Prefixed Translation Helper'
description: 'Prefixed translation helper examples for i18nit.'
---

## Prefixed Translation Helper

## Problem

Implement a prefixed translation helper in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
const auth = (key: string, vars?: Record<string, unknown>) => i18n.t(`auth.${key}`, vars);

auth('login');
auth('logout');
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Async Loading and Reload](./async-loading-and-reload.md)
- [Catalog Replacement](./catalog-replacement.md)
- [Diagnostics Hook](./diagnostics-hook.md)
