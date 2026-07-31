---
title: 'Lingua Examples — Feature Resources'
description: Load optional locale resources when a feature becomes available.
---

## Feature Resources

### Problem

You want route or feature strings to load on demand without a separate namespace registry. Declare feature resources once, then load them through the same i18n store.

### Solution

Declare `settings` beside `core`, load it for active locale, and request it while switching locale.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  resources: {
    core: {
      en: { navigation: { settings: 'Settings' } },
      fr: { navigation: { settings: 'Réglages' } },
    },
    settings: {
      en: async () => ({ title: 'Settings' }),
      fr: async () => ({ title: 'Réglages' }),
    },
  },
});

try {
  await i18n.load('settings');
  console.log(i18n.translate('title'));

  await i18n.setLocale('fr', { load: ['settings'] });
  console.log(i18n.translate('title'));
} finally {
  i18n.dispose();
}
```

### Pitfalls

- Declare a source for every locale you load for each feature resource.
- Load optional resources before rendering their keys.
- Order resource declarations intentionally; later resources override earlier duplicate keys.

### Related

- [Static translator](./static-translator.md)
- [SSR hydration](./ssr-hydration.md)
- [Lingua Usage Guide](../usage.md)
