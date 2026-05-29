---
title: 'Lingua Examples — SSR Rendering'
description: 'SSR rendering example for @vielzeug/lingua.'
---

## SSR Rendering

### Problem

You need to render translated HTML on the server for a given request locale. The rendered HTML must include the correct `lang` attribute and fully resolved translation strings before being sent to the client.

### Solution

Create a per-request `i18n` instance, await `setLocale()` to load and switch the catalog, then call `t()` and `tp()` synchronously during rendering.

```ts
import { createI18n } from '@vielzeug/lingua';

export async function renderDocument(locale: string) {
  const i18n = createI18n({
    fallback: 'en',
    locale: 'en',
    catalogs: {
      en: { title: 'Home', notifications: { one: 'One notification', other: '{count} notifications' } },
      fr: () => import('./locales/fr.json').then((m) => m.default),
    },
  });

  // Load and switch before rendering — no async calls during template evaluation
  if (locale !== 'en') {
    await i18n.setLocale(locale);
  }

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

### Pitfalls

- Do not call `t()` or `tp()` before `await i18n.setLocale(locale)` completes. Until then the instance is on the default locale and will return English strings regardless of the requested locale.
- `t()` returns a raw, unsanitized string. If any translation key value originates from user-generated content or an external CMS, sanitize it before inserting into the HTML to prevent XSS.
- `i18n.locale` is a plain string — use it directly in the `lang` attribute rather than reading it from the snapshot.

### Related

- [Per-request Locale Handling](./per-request-locale-handling.md)
- [Diagnostics Hook](./diagnostics-hook.md)
- [Shared Instance Setup](./shared-instance-setup.md)
