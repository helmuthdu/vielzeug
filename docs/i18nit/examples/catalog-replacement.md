---
title: 'I18nit Examples — Catalog Replacement'
description: 'Catalog replacement examples for i18nit.'
---

## Catalog Replacement

## Problem

Implement catalog replacement in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
i18n.setCatalog('en', {
  nav: {
    about: 'About',
    contact: 'Contact',
    help: 'Help',
  },
});
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
- [Diagnostics Hook](./diagnostics-hook.md)
- [Framework Integration](./framework-integration.md)