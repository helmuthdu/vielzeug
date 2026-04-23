# @vielzeug/i18nit

> Lightweight i18n runtime with nested keys, explicit pluralization, async loading, and unified Intl formatting.

[![npm version](https://img.shields.io/npm/v/@vielzeug/i18nit)](https://www.npmjs.com/package/@vielzeug/i18nit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/i18nit` is a zero-dependency internationalization library for TypeScript. It focuses on a small, explicit API: `t`, `tp`, `format`, `setCatalog`, `setLoader`, `preload`, and `setLocale`.

## Installation

```sh
pnpm add @vielzeug/i18nit
# npm install @vielzeug/i18nit
# yarn add @vielzeug/i18nit
```

## Entry Point

`@vielzeug/i18nit`

## Quick Start

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  messages: {
    de: {
      greeting: 'Hallo, {name}!',
      inbox: { one: 'Eine Nachricht', other: '{count} Nachrichten', zero: 'Keine Nachrichten' },
    },
    en: {
      greeting: 'Hello, {name}!',
      inbox: { zero: 'No messages', one: 'One message', other: '{count} messages' },
      nav: { home: 'Home' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 0);
i18n.tp('inbox', 3);

await i18n.setLocale('de');
i18n.t('nav.home'); // falls back to en

i18n.format({ kind: 'currency', currency: 'EUR', value: 19.99 });
```

## Features

- Dot-notation nested key lookup
- Simple interpolation (`{name}`, `{user.name}`)
- Explicit plural translation via `tp()` and `Intl.PluralRules`
- Locale chain fallback (`sr-Latn-RS -> sr-Latn -> sr`) plus configured fallbacks
- Async locale loading (`setLoader`, tolerant `preload`, strict `setLocale`)
- Catalog replacement (`setCatalog`)
- Subscription API (`subscribe`)
- Unified formatting API (`format`)
- Diagnostic hooks (`onDiagnostic`) and missing-key hook (`onMissing`)

## API At a Glance

- `createI18n(options?) => I18n`
- `i18n.t(key, vars?)`
- `i18n.tp(key, count, vars?)`
- `i18n.format(input)`
- `i18n.setCatalog(locale, messages)`
- `i18n.setLoader(locale, loader)`
- `await i18n.preload(locale)`
- `await i18n.setLocale(locale)`
- `i18n.subscribe(listener, immediate?)`

## Documentation

- [Overview](https://vielzeug.dev/i18nit/)
- [Usage Guide](https://vielzeug.dev/i18nit/usage)
- [API Reference](https://vielzeug.dev/i18nit/api)
- [Examples](https://vielzeug.dev/i18nit/examples)

## Release Notes

### Version 3

`@vielzeug/i18nit` is now a smaller, explicit runtime with a deliberately breaking API surface.

- Removed bound views and namespacing helpers such as `withLocale()` and `scope()`.
- Removed catalog mutation orchestration such as `add()`, `replace()`, `batch()`, and reload-style APIs.
- Replaced plural auto-detection in `t()` with explicit `tp(key, count, vars?)`.
- Replaced formatter helpers like `number()`, `currency()`, and `date()` with `format({ kind, ... })`.
- Kept async locale loading, but narrowed it to `setLoader()`, tolerant `preload()`, and strict `setLocale()`.

### Migration Notes

- Replace `i18n.t('items', { count })` with `i18n.tp('items', count)` for plural branches.
- Replace `i18n.switchLocale(locale)` with `await i18n.setLocale(locale)`.
- Replace `i18n.ensureLocale(locale)` with `await i18n.preload(locale)` when you only want to warm the catalog.
- Replace formatter helpers with `i18n.format({ kind: ... })`.
- Replace `scope()` and `withLocale()` usage with local wrapper functions or separate per-request instances.

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
