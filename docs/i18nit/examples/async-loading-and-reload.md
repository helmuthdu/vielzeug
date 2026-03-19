---
title: 'I18nit Examples — Async Loading and Reload'
description: 'Async Loading and Reload examples for i18nit.'
---

## Async Loading and Reload

## Problem

Implement async loading and reload in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
i18n.registerLoader('ja', () => import('./locales/ja.json'));

await i18n.load('ja'); // preload only
await i18n.setLocale('ja'); // switch after load

await i18n.reload('ja'); // force refresh from loader
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Batched Catalog Updates](./batched-catalog-updates.md)
- [Diagnostics Hook](./diagnostics-hook.md)
- [Framework Integration](./framework-integration.md)
