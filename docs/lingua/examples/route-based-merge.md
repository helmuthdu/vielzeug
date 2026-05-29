---
title: 'Lingua Examples — Route-based Partial Catalog Merge'
description: 'Route-based partial catalog merge example for @vielzeug/lingua.'
---

## Route-based Partial Catalog Merge

### Problem

You want to keep the base catalog small at startup and load route-specific keys only when the user visits that route. Registering the full catalog upfront bloats the initial bundle; replacing it with `register()` would discard the shared base keys.

### Solution

Use `merge()` in the route enter hook to overlay route-specific keys on top of the base catalog without replacing it.

```ts
import { createI18n } from '@vielzeug/lingua';

// Base catalog — keys shared across all routes
export const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  catalogs: {
    en: {
      nav: { home: 'Home', settings: 'Settings' },
      error: { notFound: 'Page not found' },
    },
    de: () => import('./locales/base.de.json').then((m) => m.default),
  },
});

// Route enter hook — load per-route keys on demand
async function onEnterSettings() {
  await Promise.all([
    i18n.merge('en', () => import('./routes/settings.i18n.json').then((m) => m.default)),
    i18n.merge('de', () => import('./routes/settings.i18n.de.json').then((m) => m.default)),
  ]);
}

// After merge, route keys are available alongside base keys
await onEnterSettings();

i18n.t('settings.heading'); // from merge
i18n.t('nav.home');         // from base catalog — still present

// Use scope() to avoid repeating the 'settings' prefix
const s = i18n.scope('settings');
s.t('heading');       // 'Account Settings'
s.t('danger.delete'); // 'Delete account'
```

### Pitfalls

- Merging a locale that is not in the active fallback chain downloads the data but does not notify subscribers. The merged keys will be available once that locale becomes active via `setLocale()`.
- A subsequent `register(locale, source)` replaces the full catalog, discarding all previously merged keys. Do not mix `register()` and `merge()` for the same locale.
- There is no automatic eviction. Merged keys persist for the lifetime of the `i18n` instance — do not merge user-generated content or untrusted catalog data.

### Related

- [Shared Instance Setup](./shared-instance-setup.md)
- [Catalog Replacement](./catalog-replacement.md)
- [Async Loading and Reload](./async-loading-and-reload.md)
