---
title: 'I18nit Examples — SSR Rendering with withLocale'
description: 'SSR Rendering with withLocale examples for i18nit.'
---

## SSR Rendering with withLocale

## Problem

Implement ssr rendering with withlocale in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
function renderHtml(locale: string) {
  const t = i18n.withLocale(locale).t;

  return `
    <html>
      <body>
        <h1>${t('greeting', { name: 'Guest' })}</h1>
      </body>
    </html>
  `;
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
