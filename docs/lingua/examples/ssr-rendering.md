---
title: 'Lingua Examples — SSR Rendering'
description: 'SSR rendering example for @vielzeug/lingua.'
---

## SSR Rendering

### Problem

You need to render translated HTML on the server for a given request locale. The rendered HTML must include the correct `lang` attribute and fully resolved translation strings before being sent to the client.

### Solution

Maintain a shared `i18n` instance at module scope (so catalog setup runs only once). Use `fork()` to create an isolated child per request, then call `setLocale()` to load and switch the catalog before rendering.

```ts
import { createI18n } from '@vielzeug/lingua';

// Shared instance — registered once at startup
const sharedI18n = createI18n({
  fallback: 'en',
  locale: 'en',
  catalogs: {
    en: { title: 'Home', notifications: { one: 'One notification', other: '{count} notifications' } },
    fr: () => import('./locales/fr.json').then((m) => m.default),
  },
});

export async function renderDocument(locale: string) {
  // Fork creates an isolated instance from the current catalog snapshot.
  // Catalog and locale changes on the fork do not affect sharedI18n.
  const reqI18n = sharedI18n.fork({ locale: 'en' });

  // Load and switch before rendering — no async calls during template evaluation
  if (locale !== 'en') {
    await reqI18n.setLocale(locale);
  }

  return `
    <!doctype html>
    <html lang="${reqI18n.locale}">
      <body>
        <h1>${reqI18n.t('title')}</h1>
        <p>${reqI18n.tp('notifications', 3)}</p>
      </body>
    </html>
  `;
}
```

If namespaces are registered on the shared instance before forking, they are available on the fork too:

```ts
sharedI18n.registerNamespace('settings', (locale) =>
  import(`./locales/${locale}/settings.json`).then((m) => m.default),
);

// In the request handler:
const reqI18n = sharedI18n.fork({ locale: req.locale });
await reqI18n.setLocale(req.locale);
await reqI18n.loadNamespace('settings'); // loads for req.locale only
```

### Pitfalls

- Do not call `t()` or `tp()` before `await reqI18n.setLocale(locale)` completes. Until then the instance is on the default locale and will return English strings regardless of the requested locale.
- `t()` returns a raw, unsanitized string. If any translation key value originates from user-generated content or an external CMS, sanitize it before inserting into the HTML to prevent XSS.
- `i18n.locale` is a plain string — use it directly in the `lang` attribute rather than reading it from the snapshot.
- Prefer `fork()` over `createI18n()` per request — `fork()` reuses the parent's already-resolved catalog snapshots and avoids re-running all loaders on every request.

### Related

- [Per-request Locale Handling](./per-request-locale-handling.md)
- [Diagnostics Hook](./diagnostics-hook.md)
- [Shared Instance Setup](./shared-instance-setup.md)
