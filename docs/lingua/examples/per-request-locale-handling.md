---
title: 'Lingua Examples — Per-request Locale Handling'
description: 'Per-request locale handling example for @vielzeug/lingua.'
---

## Per-request Locale Handling

### Problem

In an SSR context, a shared mutable `i18n` singleton causes locale state to leak across concurrent requests. Request A sets `locale: 'fr'`; request B, arriving mid-render, inadvertently reads French strings.

### Solution

Maintain a shared `i18n` instance at module scope and call `fork()` per request. The fork inherits the parent's catalog snapshots and loaders so nothing is re-registered. Each fork has its own locale, version counter, and subscriber set.

```ts
import { createI18n } from '@vielzeug/lingua';

// Shared instance — set up once at server startup
export const sharedI18n = createI18n({
  fallback: 'en',
  locale: 'en',
  catalogs: {
    en: { title: 'Home' },
    fr: () => import('./locales/fr.json').then((m) => m.default),
    de: () => import('./locales/de.json').then((m) => m.default),
  },
});

// In your request handler
const requestLocale = req.headers['accept-language']?.split(',')[0] ?? 'en';
const reqI18n = sharedI18n.fork({ locale: 'en' });

// setLocale() loads if needed and switches atomically
if (requestLocale !== 'en') {
  await reqI18n.setLocale(requestLocale);
}

const html = `<h1>${reqI18n.t('title')}</h1>`;
```

### Pitfalls

- `fork()` copies the catalog snapshot at call time. If the shared instance loads a new locale after a fork is created, the fork does not automatically gain access to it. For preloaded locales this is fine — the fork inherits loaders and will load on demand via `setLocale()`.
- `setLocale()` throws `[lingua/E001]` if the locale is not registered. Validate the request locale against `sharedI18n.getSupportedLocales()` before switching to avoid a 500 error from an unexpected locale header.
- Do not share the per-request fork across async boundaries (e.g. via a module-level variable) — pass it explicitly to rendering functions.

### Related

- [SSR Rendering](./ssr-rendering.md)
- [Diagnostics Hook](./diagnostics-hook.md)
- [Shared Instance Setup](./shared-instance-setup.md)
