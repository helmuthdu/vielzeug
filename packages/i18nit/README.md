# @vielzeug/i18nit

Minimal i18n runtime with typed keys, explicit locale sources, and framework-friendly subscriptions.

## Installation

```sh
pnpm add @vielzeug/i18nit
```

## Quick Start

```ts
import { createI18n } from '@vielzeug/i18nit';
import { createFormatter } from '@vielzeug/i18nit/format';

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

await i18n.preload('de');
await i18n.setLocale('de');

i18n.t('greeting', { vars: { name: 'Alice' } });
i18n.t('inbox', { count: 3 });

const fmt = createFormatter(i18n);
fmt.currency(19.99, 'EUR');
```

## Core API

- `createI18n(options?)`
- `i18n.t(key, options?)`
- `i18n.preload(locale)`
- `i18n.setLocale(locale)`
- `i18n.register(locale, source)`
- `i18n.getSnapshot()`
- `i18n.subscribe(listener, { immediate? })`
- `i18n.getSupportedLocales({ sorted? })`
- `i18n.has(key)`

## Translation options

```ts
type TranslateOptions = {
  count?: number;   // enables plural branch resolution
  ordinal?: boolean;
  vars?: Record<string, unknown>;
};
```

## Missing handling

A single callback handles missing keys and missing interpolation variables.

```ts
const i18n = createI18n({
  onMissing(info) {
    if (info.type === 'var') return `<${info.varName}>`;

    return `[missing:${info.key}]`;
  },
});
```

## Framework integration

`subscribe()` follows a store-like shape and `getSnapshot()` is stable for framework adapters.

```ts
const unsubscribe = i18n.subscribe(() => {
  const { locale, version } = i18n.getSnapshot();
  console.log(locale, version);
});
```

## Formatting

Formatting lives in `@vielzeug/i18nit/format` and can bind to:

- a static locale string
- an i18n-like source with `locale`
- a store-like source with `getSnapshot()`
