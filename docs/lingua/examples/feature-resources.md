---
title: 'Lingua Examples — Lazy Locale Catalog'
description: Load a locale catalog only when locale becomes active.
---

## Lazy Locale Catalog

### Problem

You want bundled default language and on-demand catalogs for other locales without namespace lifecycle or merge rules.

### Solution

Provide the default catalog eagerly and a `loadCatalog` function for other locales. Switching locale loads before committing the change.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  catalogs: { en: { title: 'Settings' } },
  locale: 'en',
  loadCatalog: (locale) => import(`./locales/${locale}.ts`).then((m) => m.default),
});

try {
  console.log(i18n.translate('title'));

  await i18n.setLocale('fr');
  console.log(i18n.translate('title'));
} finally {
  i18n.dispose();
}
```

### Pitfalls

- Await `setLocale()` before rendering the selected locale.
- Use `load()` before first render only for loader-only configuration.
- Keep each locale catalog complete for required keys.

### Related

- [Static translator](./static-translator.md)
- [SSR hydration](./ssr-hydration.md)
- [Lingua Usage Guide](../usage.md)
