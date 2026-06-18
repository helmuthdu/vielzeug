---
title: 'Lingua Examples — Route-based Namespace Loading'
description: 'Route-based namespace loading example for @vielzeug/lingua.'
---

## Route-based Namespace Loading

### Problem

You want to keep the base catalog small at startup and load route-specific keys only when the user visits that route. Registering the full catalog upfront bloats the initial bundle; replacing it with `register()` would discard the shared base keys.

### Solution

Call `extend()` in the route enter hook. It registers the factory and immediately loads it for the active locale in a single step. Deduplication ensures the factory runs at most once per `ns + locale` pair.

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

const settingsFactory = (locale: string) => import(`./routes/${locale}/settings.i18n.json`).then((m) => m.default);

// Route enter hook — register and load per-route keys on demand
async function onEnterSettings() {
  await i18n.extend('settings', settingsFactory);
}

// After loading, route keys are available alongside base keys
await onEnterSettings();

i18n.t('settings.heading'); // from namespace
i18n.t('nav.home'); // from base catalog — still present

// Use scope() to avoid repeating the 'settings' prefix
const s = i18n.scope('settings');
s.t('heading'); // 'Account Settings'
s.t('danger.delete'); // 'Delete account'
```

### Pitfalls

- Calling `extend()` for a locale not in the active fallback chain applies the keys but does not notify subscribers. The keys will be available once that locale becomes active via `setLocale()`.
- A subsequent `register(locale, source)` replaces the full catalog, discarding all namespace-merged keys for that locale. Avoid mixing `register()` and `extend()` for the same locale after initial setup.
- Namespace deduplication is per-instance. Forked instances inherit the loaded-namespace markers — calling `extend()` on a fork that already saw it loaded on the parent is a no-op.

### Related

- [Shared Instance Setup](./shared-instance-setup.md)
- [Catalog Replacement](./catalog-replacement.md)
- [Async Loading and Reload](./async-loading-and-reload.md)
