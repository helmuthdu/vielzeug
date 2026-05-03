---
title: 'I18nit Examples — Shared Instance Setup'
description: 'Create a shared browser-side i18nit instance with built-in catalogs and lazy locale loaders.'
---

## Shared Instance Setup

Use one shared instance when your app runs in a single browser session and changing the locale globally is the intended behavior.

## Example

```ts
import { createI18n } from '@vielzeug/i18nit';

export const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  loaders: {
    de: () => import('./locales/de.json').then((m) => m.default),
    fr: () => import('./locales/fr.json').then((m) => m.default),
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

await i18n.preload('fr');

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);
```

## Notes

- Shared instances are best for client-only apps where locale state is global.
- `preload()` is safe to call opportunistically and never throws.
- `setLocale()` should still be used for user-visible locale switches.

## Related Recipes

- [Async Loading and Preload](./async-loading-and-reload.md)
- [Catalog Replacement](./catalog-replacement.md)
- [Diagnostics Hook](./diagnostics-hook.md)
