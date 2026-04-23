---
title: 'I18nit Examples — Async Loading and Locale Switch'
description: 'Async loading and strict locale switching examples for i18nit.'
---

## Async Loading and Locale Switch

## Problem

Implement async loading and locale switching in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
i18n.setLoader('ja', () => import('./locales/ja.json'));

await i18n.preload('ja'); // tolerant preload
await i18n.setLocale('ja'); // strict switch

i18n.setCatalog('ja', { greeting: 'こんにちは' }); // replace catalog
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Diagnostics Hook](./diagnostics-hook.md)
- [Framework Integration](./framework-integration.md)
