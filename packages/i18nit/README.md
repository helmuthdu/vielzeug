# @vielzeug/i18nit

> Lightweight i18n runtime with nested keys, explicit plural translation, best-effort locale loading, and unified Intl formatting.

[![npm version](https://img.shields.io/npm/v/@vielzeug/i18nit)](https://www.npmjs.com/package/@vielzeug/i18nit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/i18nit` keeps the surface deliberately small:

- `createI18n` for creating an isolated translation runtime
- `t` for direct translation lookup with interpolation
- `tp` for explicit plural branches
- `format` for locale-aware numbers, currency, dates, relative time, and lists
- `setCatalog`, `setLoader`, `preload`, and `setLocale` for catalog management

## Entry Point

| Entry | Purpose |
| --- | --- |
| `@vielzeug/i18nit` | `createI18n`, diagnostic guards, runtime types, and the full translation API |

## Installation

```sh
pnpm add @vielzeug/i18nit
# npm install @vielzeug/i18nit
# yarn add @vielzeug/i18nit
```

## Quick Start

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  loaders: {
    de: () => import('./locales/de.json').then((m) => m.default),
  },
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: {
        zero: 'No messages',
        one: 'One message',
        other: '{count} messages',
      },
      nav: { home: 'Home' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);

await i18n.preload('de');
await i18n.setLocale('de');

i18n.format({ kind: 'currency', currency: 'EUR', value: 19.99 });
```

## Features

- Nested key lookup via dot notation
- Interpolation for plain and nested variables
- Explicit plural translation with `tp()` and `Intl.PluralRules`
- Locale cascade through BCP 47 parents plus configured fallback locales
- Best-effort preloading and strict locale switching
- Runtime catalog replacement and loader registration
- Locale-aware formatting through one `format()` entry point
- Subscription and diagnostics hooks for UI integration and observability
- Zero runtime dependencies

## Core API

- `createI18n(options?) => I18n`
- `i18n.t(key, vars?)`
- `i18n.tp(key, count, vars?)`
- `i18n.format(input)`
- `i18n.setCatalog(locale, messages)`
- `i18n.setLoader(locale, loader)`
- `await i18n.preload(locale)`
- `await i18n.setLocale(locale)`
- `i18n.subscribe(listener, immediate?)`

```ts
const stop = i18n.subscribe(({ locale, reason }) => {
  console.log(locale, reason);
}, true);

stop();
```

## Documentation

- [Overview](https://vielzeug.dev/i18nit/)
- [Usage Guide](https://vielzeug.dev/i18nit/usage)
- [API Reference](https://vielzeug.dev/i18nit/api)
- [Examples](https://vielzeug.dev/i18nit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu/vielzeug) — part of the Vielzeug monorepo.
