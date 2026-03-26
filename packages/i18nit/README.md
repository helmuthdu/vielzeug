# @vielzeug/i18nit

> Lightweight, type-safe i18n with nested keys, lazy loaders, interpolation, pluralization, and reactive subscriptions.

[![npm version](https://img.shields.io/npm/v/@vielzeug/i18nit)](https://www.npmjs.com/package/@vielzeug/i18nit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/i18nit` is a zero-dependency internationalization library for TypeScript. It combines typed key paths, fallback locale chains, async locale loading, and Intl formatting helpers.

## Installation

```sh
pnpm add @vielzeug/i18nit
# npm install @vielzeug/i18nit
# yarn add @vielzeug/i18nit
```

## Entry Points

| Entry | Purpose |
| --- | --- |
| `@vielzeug/i18nit` | Main API (`createI18n`, exported types) |
| `@vielzeug/i18nit/core` | Core bundle entry |

## Quick Start

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  messages: {
    de: {
      greeting: 'Hallo, {name}!',
      inbox: { one: 'Eine Nachricht', other: '{count} Nachrichten' },
    },
    en: {
      greeting: 'Hello, {name}!',
      inbox: { zero: 'No messages', one: 'One message', other: '{count} messages' },
      nav: { home: 'Home' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' });
i18n.t('inbox', { count: 0 });
i18n.t('inbox', { count: 3 });

await i18n.switchLocale('de');
i18n.t('nav.home'); // falls back to en
```

## Features

- Typed translation keys from your message tree
- Dot-notation nested key lookup
- ICU-style interpolation with object/array path support
- Plural messages (`zero/one/two/few/many/other`) via `Intl.PluralRules`
- Locale chain fallback (`sr-Latn-RS -> sr-Latn -> sr`) + configured fallback locales
- Async locale loading (`ensureLocale`, `switchLocale`, `registerLoader`, `reload`)
- Catalog updates (`add` deep-merge, `replace` full replace)
- Subscription API with batched notifications (`batch`, `subscribe`)
- Intl format helpers (`number`, `date`, `list`, `relative`, `currency`)
- Namespace and locale-bound views (`scope`, `withLocale`)
- Diagnostic hooks (`onDiagnostic`) and missing-key hook (`onMissing`)

## API At a Glance

- `createI18n<T>(options?) => I18n<T>`
- `type BoundI18n<T>`
- `type I18n<T>`
- `type I18nOptions<T>`
- `type Messages`, `TranslationKey`, `TranslationKeyParam`, `PluralKeys`, `NamespaceKeys`

## Documentation

- [Overview](https://vielzeug.dev/i18nit/)
- [Usage Guide](https://vielzeug.dev/i18nit/usage)
- [API Reference](https://vielzeug.dev/i18nit/api)
- [Examples](https://vielzeug.dev/i18nit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
