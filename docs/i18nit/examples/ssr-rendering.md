---
title: 'I18nit Examples — SSR Rendering'
description: 'Render translated HTML on the server with per-request i18n instances.'
---

## SSR Rendering

```ts
import { createI18n } from '@vielzeug/i18nit';

export async function renderDocument(locale: string) {
  const i18n = createI18n({
    fallback: 'en',
    locale,
    catalogs: {
      en: { title: 'Home', notifications: { one: 'One notification', other: '{count} notifications' } },
      fr: () => import('./locales/fr.json').then((m) => m.default),
    },
  });

  await i18n.setLocale(locale);

  return `
    <!doctype html>
    <html lang="${i18n.locale}">
      <body>
        <h1>${i18n.t('title')}</h1>
        <p>${i18n.t('notifications', { count: 3 })}</p>
      </body>
    </html>
  `;
}
```
