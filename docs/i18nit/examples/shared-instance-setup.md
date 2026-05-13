---
title: 'I18nit Examples — Shared Instance Setup'
description: 'Create a shared browser-side i18n instance with static and lazy locale sources.'
---

## Shared Instance Setup

```ts
import { createI18n } from '@vielzeug/i18nit';

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

await i18n.preload('fr');

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);
```
