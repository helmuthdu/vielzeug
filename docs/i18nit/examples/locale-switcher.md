---
title: 'I18nit Examples — Locale Switcher'
description: 'Locale Switcher examples for i18nit.'
---

## Locale Switcher

## Problem

Implement locale switcher in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
async function switchLocale(locale: string) {
  await i18n.setLocale(locale);
  render();
}

for (const locale of i18n.locales) {
  console.log(locale);
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

- [Async Loading and Reload](./async-loading-and-reload.md)
- [Batched Catalog Updates](./batched-catalog-updates.md)
- [Diagnostics Hook](./diagnostics-hook.md)
