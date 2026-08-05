---
title: 'Lingua Examples — Lazy Locale Catalog'
description: Load a locale catalog only when locale becomes active.
---

## Lazy Locale Catalog

### Problem

You want bundled default language and on-demand catalogs for other locales without namespace lifecycle or merge rules.

### Solution

Declare one catalog source per locale. Switch locale, then load it explicitly.

```ts
import { createTranslationStore } from '@vielzeug/lingua';

const i18n = createTranslationStore({
  catalogs: {
    en: { title: 'Settings' },
    fr: async () => ({ title: 'Réglages' }),
  },
  locale: 'en',
});

try {
  console.log(i18n.translate('title'));

  await i18n.setLocale('fr');
  await i18n.load();
  console.log(i18n.translate('title'));
} finally {
  i18n.dispose();
}
```

### Pitfalls

- Declare source for every locale selected at runtime.
- Load a lazy catalog before rendering its translations.
- Keep each locale catalog complete for required keys.

### Related

- [Static translator](./static-translator.md)
- [SSR hydration](./ssr-hydration.md)
- [Lingua Usage Guide](../usage.md)
