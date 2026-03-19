---
title: 'I18nit Examples — Shared Instance Setup'
description: 'Shared Instance Setup examples for i18nit.'
---

## Shared Instance Setup

## Problem

Implement shared instance setup in a production-friendly way with `@vielzeug/i18nit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/i18nit` installed.

```ts
import { createI18n } from '@vielzeug/i18nit';

export const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  loaders: {
    de: () => import('./locales/de.json'),
    fr: () => import('./locales/fr.json'),
  },
  messages: {
    en: {
      auth: { login: 'Log in', logout: 'Log out' },
      greeting: 'Hello, {name}!',
      inbox: { zero: 'No messages', one: 'One message', other: '{count} messages' },
      nav: { home: 'Home' },
    },
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
- [Diagnostics Hook](./diagnostics-hook.md)
