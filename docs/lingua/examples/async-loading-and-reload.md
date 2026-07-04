---
title: 'Lingua Examples — Async Loading and Reload'
description: 'Async loading and reload example for @vielzeug/lingua.'
---

## Async Loading and Reload

### Problem

You want to keep initial bundle size small by loading non-default locale catalogs on demand. You also need to replace a catalog at runtime — for example when the user selects a tenant-specific override.

### Solution

Pass an async loader function for each non-default locale. Use `preload()` to download a catalog in the background, and `register()` to replace it entirely at runtime.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello!' },
    ja: () => import('./locales/ja.json').then((m) => m.default),
  },
});

// Warm up before the user requests the locale
await i18n.preload('ja');
await i18n.setLocale('ja');

// Replace the full catalog at runtime (e.g. after a CMS update)
i18n.register('ja', { greeting: 'こんにちは' });
```

### Pitfalls

- `preload()` is idempotent — calling it again for an already-loaded locale is a no-op. Calling it for a locale that is not registered throws `LinguaMissingLocaleError`; always register before preloading.
- `register()` triggers a subscriber notification even if the catalog content is identical. Avoid calling it in hot code paths.
- If you need to add keys without discarding the existing catalog, use `extend()` instead of `register()`.

### Related

- [Route-based Merge](./route-based-merge.md)
- [Catalog Replacement](./catalog-replacement.md)
- [Shared Instance Setup](./shared-instance-setup.md)
