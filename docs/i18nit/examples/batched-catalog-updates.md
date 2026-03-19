---
title: 'I18nit Examples — Batched Catalog Updates'
description: 'Batched Catalog Updates examples for i18nit.'
---

## Batched Catalog Updates

## Problem

Implement batched catalog updates in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
i18n.batch(() => {
  i18n.add('en', { nav: { about: 'About' } });
  i18n.add('en', { nav: { contact: 'Contact' } });
  i18n.add('en', { nav: { help: 'Help' } });
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
