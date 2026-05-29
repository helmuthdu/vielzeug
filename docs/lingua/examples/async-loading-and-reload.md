---
title: 'Lingua Examples — Async Loading'
description: 'Use dynamic locale sources with preload() and strict setLocale().'
---

## Async Loading

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello!' },
    ja: () => import('./locales/ja.json').then((m) => m.default),
  },
});

await i18n.preload('ja');
await i18n.setLocale('ja');

i18n.register('ja', { greeting: 'こんにちは' });
```

## Notes

- `preload()` loads a locale without switching.
- `setLocale()` loads if needed, then switches.
- `register()` can replace a locale source at runtime.
