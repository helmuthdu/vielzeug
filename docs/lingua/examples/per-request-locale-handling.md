---
title: 'Lingua Examples — Per-request Locale Handling'
description: 'Per-request locale handling example for @vielzeug/lingua.'
---

## Per-request Locale Handling

### Problem

In an SSR context, a shared mutable `i18n` singleton causes locale state to leak across concurrent requests. Request A sets `locale: 'fr'`; request B, arriving mid-render, inadvertently reads French strings.

### Solution

Create a new `i18n` instance per request. Each instance is an isolated plain object with no global side effects.

```ts
import { createI18n } from '@vielzeug/lingua';

export async function createRequestI18n(locale: string) {
  const i18n = createI18n({
    fallback: 'en',
    locale: 'en', // start with default; switch below
    catalogs: {
      en: { title: 'Home' },
      fr: () => import('./locales/fr.json').then((m) => m.default),
      de: () => import('./locales/de.json').then((m) => m.default),
    },
  });

  // setLocale loads the catalog and switches atomically
  if (locale !== 'en') {
    await i18n.setLocale(locale);
  }

  return i18n;
}

// In your request handler
const requestLocale = req.headers['accept-language']?.split(',')[0] ?? 'en';
const i18n = await createRequestI18n(requestLocale);

const html = `<h1>${i18n.t('title')}</h1>`;
```

### Pitfalls

- Creating a new instance per request has a small overhead. Prefer caching a pre-loaded instance per locale when the locale set is small and catalogs are stable.
- `setLocale()` throws `[lingua/E001]` if the locale is not registered. Validate the request locale against `i18n.getSupportedLocales()` before switching to avoid a 500 error from an unexpected locale header.
- Do not share the per-request instance across async boundaries (e.g. via a module-level variable) — pass it explicitly to rendering functions.

### Related

- [SSR Rendering](./ssr-rendering.md)
- [Diagnostics Hook](./diagnostics-hook.md)
- [Shared Instance Setup](./shared-instance-setup.md)
