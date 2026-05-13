---
title: I18nit
description: Minimal, typed i18n runtime with framework-friendly store semantics.
---

`@vielzeug/i18nit` is a small runtime with one translation method, explicit locale source registration, and predictable framework integration.

## Design principles

- Single translation entrypoint: `t(key, options?)`
- Locale source registry with static or dynamic entries
- Store-style reactivity via `getSnapshot()` and `subscribe()`
- Formatter utilities split into `@vielzeug/i18nit/format`

## Quick example

```ts
import { createI18n } from '@vielzeug/i18nit';
import { createFormatter } from '@vielzeug/i18nit/format';

const i18n = createI18n({
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello, {name}!' },
    fr: () => import('./locales/fr.json').then((m) => m.default),
  },
});

await i18n.setLocale('fr');

const greeting = i18n.t('greeting', { vars: { name: 'Alice' } });
const fmt = createFormatter(i18n);
const price = fmt.currency(12.5, 'EUR');
```

## Next steps

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
