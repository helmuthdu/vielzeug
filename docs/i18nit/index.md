---
title: I18nit — Internationalization for TypeScript
description: Zero-dependency i18n library with type-safe keys, nested messages, variable interpolation, pluralisation, lazy loaders, formatting helpers, and reactive subscriptions.
---

<PackageBadges package="i18nit" />

<img src="/logo-i18nit.svg" alt="I18nit Logo" width="156" class="logo-highlight"/>

# I18nit

**i18nit** is a minimal, zero-dependency internationalisation library for TypeScript. Define messages as typed objects, access them with dot-notation keys, interpolate variables, pluralise, load locale bundles on demand, and subscribe to locale changes — all with first-class TypeScript inference throughout.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/i18nit
```

```sh [npm]
npm install @vielzeug/i18nit
```

```sh [yarn]
yarn add @vielzeug/i18nit
```

:::

## Quick Start

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: { zero: 'No messages', one: 'One message', other: '{count} messages' },
      nav: { home: 'Home', about: 'About' },
    },
    de: {
      greeting: 'Hallo, {name}!',
      inbox: { one: 'Eine Nachricht', other: '{count} Nachrichten' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('nav.home');                     // "Home"
i18n.t('inbox', { count: 0 });          // "No messages"
i18n.t('inbox', { count: 3 });          // "3 messages"

i18n.locale = 'de';
i18n.t('greeting', { name: 'Alice' }); // "Hallo, Alice!"
i18n.t('nav.home');                     // "Home" (fallback to 'en')
```

## Features

- **Type-safe keys** — `TranslationKey<T>` resolves all valid dot-notation paths from your message object
- **Variable interpolation** — `{var}`, `{obj.prop}`, `{arr[0]}`, `{arr|and}`, `{arr| - }` and more
- **Pluralisation** — `Intl.PluralRules`-based with `zero/one/two/few/many/other` plural forms
- **Nested messages** — deeply nested message trees accessed via dot-notation keys
- **Fallback chain** — automatic `locale → lang-root → fallback(s)` resolution for missing keys
- **Message management** — `add()` deep-merges, `replace()` swaps the entire catalog
- **Async loading** — `registerLoader()` + `setLocale()` for on-demand locale bundles
- **Scope & withLocale** — `scope(ns)` for key-prefix binding, `withLocale(locale)` for locale-pinned translations
- **Formatting helpers** — `number()`, `date()`, `list()`, `relative()`, `currency()` all backed by `Intl`
- **Reactive subscriptions** — `subscribe(fn, immediate?)` + `dispose()` for locale-change notifications
- **Lightweight** — <PackageInfo package="i18nit" type="size" /> gzipped, zero dependencies

## Next Steps

|                           |                                                   |
| ------------------------- | ------------------------------------------------- |
| [Usage Guide](./usage.md) | Messages, interpolation, pluralisation, and patterns |
| [API Reference](./api.md) | Complete type signatures and API documentation    |
| [Examples](./examples.md) | Real-world i18n recipes                           |
