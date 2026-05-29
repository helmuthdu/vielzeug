---
title: 'Lingua Examples — Per-request Locale Handling'
description: 'Create one i18n instance per request for SSR and multi-tenant environments.'
---

## Per-request Locale Handling

```ts
import { createI18n } from '@vielzeug/lingua';

export async function createRequestI18n(locale: string) {
  const i18n = createI18n({
    fallback: 'en',
    locale,
    catalogs: {
      en: { title: 'Home' },
      fr: () => import('./locales/fr.json').then((m) => m.default),
    },
  });

  await i18n.setLocale(locale);

  return i18n;
}
```

## Notes

- Avoid shared mutable singletons on the server.
- Keep locale state isolated per request.
