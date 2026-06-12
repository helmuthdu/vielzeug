---
title: 'Lingua Examples — Shared Instance Setup'
description: 'Shared instance setup example for @vielzeug/lingua.'
---

## Shared Instance Setup

### Problem

You need one `i18n` instance shared across your entire app with a mix of eagerly-loaded and lazily-loaded locale catalogs. Creating multiple instances causes diverging locale state and duplicated catalog downloads.

### Solution

Create a single instance in a dedicated module and export it. Pass static messages for the default locale and async loader functions for all others.

```ts
import { createI18n } from '@vielzeug/lingua';

// i18n.ts — exported singleton
export const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  catalogs: {
    en: {
      auth: { login: 'Log in', logout: 'Log out' },
      greeting: 'Hello, {name}!',
      inbox: { zero: 'No messages', one: 'One message', other: '{count} messages' },
      nav: { home: 'Home' },
    },
    de: () => import('./locales/de.json').then((m) => m.default),
    fr: () => import('./locales/fr.json').then((m) => m.default),
  },
});

// In your app entry point
await i18n.preload('fr');

// In any component or module
import { i18n } from './i18n';

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);
```

### Pitfalls

- Do not call `createI18n` more than once per app. Every call creates an independent locale state — there is no global registry.
- `preload` in the entry point does not block rendering. Await it before your first render if translated content is needed immediately.
- Passing the `en` catalog as a static object means it is always bundled. Keep it small, or lazy-load it too if the default locale varies.

### Related

- [Async Loading and Reload](./async-loading-and-reload.md)
- [Route-based Merge](./route-based-merge.md)
- [Locale Switcher](./locale-switcher.md)
