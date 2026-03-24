---
title: 'I18nit Examples — Locale-bound Translator'
description: 'Locale-bound Translator examples for i18nit.'
---

## Locale-bound Translator

## Problem

Implement locale-bound translator in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
const fr = i18n.withLocale('fr');
const de = i18n.withLocale('de');

console.log(fr.t('greeting', { name: 'Alice' }));
console.log(de.t('greeting', { name: 'Alice' }));
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
- [Batched Catalog Updates](./batched-catalog-updates.md)
- [Diagnostics Hook](./diagnostics-hook.md)
