---
title: 'Lingua Examples — Error Handling'
description: 'Handle preload/setLocale errors at the call site.'
---

## Error Handling

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { title: 'Home' },
    fr: () => fetch('/api/locales/fr').then((r) => r.json()),
  },
});

try {
  await i18n.preload('fr');
  await i18n.setLocale('fr');
} catch (error) {
  console.error('Could not switch locale', error);
}
```

## Notes

- The runtime has no diagnostics bus by design.
- `preload()` and `setLocale()` reject on loading errors.
