---
title: 'I18nit Examples — Per-request Locale Handling'
description: 'Per-request locale handling examples for i18nit.'
---

## Per-request Locale Handling

## Problem

Implement per-request locale handling in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
async function renderForLocale(locale: string) {
  const localI18n = createI18n({
    fallback: 'en',
    locale,
    messages: catalogs,
  });

  return localI18n.t('greeting', { name: 'Alice' });
}

console.log(await renderForLocale('fr'));
console.log(await renderForLocale('de'));
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
- [SSR Rendering](./ssr-rendering.md)
- [Diagnostics Hook](./diagnostics-hook.md)
