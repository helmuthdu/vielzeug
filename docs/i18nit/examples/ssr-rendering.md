---
title: 'I18nit Examples — SSR Rendering'
description: 'Render translated HTML on the server with per-request i18nit instances.'
---

## SSR Rendering

Server rendering should use a fresh instance for each request and fully resolve the locale before generating HTML.

## Example

```ts
import { createI18n } from '@vielzeug/i18nit';

export async function renderDocument(locale: string) {
  const i18n = createI18n({
    fallback: 'en',
    locale,
    loaders: {
      en: () => import('./locales/en.json').then((m) => m.default),
      fr: () => import('./locales/fr.json').then((m) => m.default),
    },
  });

  await i18n.setLocale(locale);

  return `
    <!doctype html>
    <html lang="${i18n.locale}">
      <body>
        <h1>${i18n.t('title')}</h1>
        <p>${i18n.tp('notifications', 3)}</p>
      </body>
    </html>
  `;
}
```

## Notes

- Avoid a module-level singleton here.
- The returned HTML should already reflect the request locale.
- If locale loading fails, let the request fail or fall back explicitly in your server layer.

## Related Recipes

- [Async Loading and Preload](./async-loading-and-reload.md)
- [Diagnostics Hook](./diagnostics-hook.md)
