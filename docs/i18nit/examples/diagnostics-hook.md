---
title: 'I18nit Examples — Diagnostics Hook'
description: 'Diagnostics Hook examples for i18nit.'
---

## Diagnostics Hook

## Problem

Implement diagnostics hook in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
const i18nWithDiagnostics = createI18n({
  locale: 'en',
  loaders: {
    fr: () => fetch('/api/locales/fr').then((r) => r.json()),
  },
  onDiagnostic: (event) => {
    if (event.kind === 'loader-error') {
      console.warn('Loader failed:', event.locale, event.error);
    } else {
      console.error('Subscriber failed:', event.error);
    }
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
- [Batched Catalog Updates](./batched-catalog-updates.md)
- [Framework Integration](./framework-integration.md)
