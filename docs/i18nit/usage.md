---
title: I18nit — Usage Guide
description: Practical usage patterns for @vielzeug/i18nit.
---

[[toc]]

## Setup

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: {
        zero: 'No messages',
        one: 'One message',
        other: '{count} messages',
      },
    },
    de: () => import('./locales/de.json').then((m) => m.default),
  },
});
```

## Translate

```ts
i18n.t('greeting', { vars: { name: 'Alice' } });
i18n.t('inbox', { count: 3 });
i18n.t('position', { count: 2, ordinal: true });
```

## Locale lifecycle

```ts
await i18n.preload('de');
await i18n.setLocale('de');

i18n.register('fr', () => import('./locales/fr.json').then((m) => m.default));
```

## Reactivity and framework adapters

```ts
const stop = i18n.subscribe(() => {
  const { locale, version } = i18n.getSnapshot();
  console.log(locale, version);
}, { immediate: true });

stop();
```

## Missing handling

```ts
const strictI18n = createI18n({
  onMissing(info) {
    if (info.type === 'var') return `<missing:${info.varName}>`;

    return `[missing:${info.key}]`;
  },
});
```
