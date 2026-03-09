---
title: I18nit — Internationalization for TypeScript
description: Zero-dependency i18n library with nested keys, interpolation, async locale loading, and reactive subscription support.
---

<PackageBadges package="i18nit" />

<img src="/logo-i18nit.svg" alt="I18nit Logo" width="156" class="logo-highlight"/>

# I18nit

**I18nit** is a zero-dependency internationalization library with nested keys, variable interpolation, async locale loading, and reactive subscriptions.

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
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      items: { one: 'You have one item', other: 'You have {count} items' },
      nav: { home: 'Home', about: 'About' },
    },
    es: {
      greeting: '¡Hola, {name}!',
      nav: { home: 'Inicio', about: 'Acerca de' },
    },
  },
});

// Translate
i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('nav.home');                     // "Home"
i18n.t('items', { count: 1 });          // "You have one item"
i18n.t('items', { count: 5 });          // "You have 5 items"

// Switch locale
i18n.locale = 'es';
i18n.t('greeting', { name: 'Alice' }); // "¡Hola, Alice!"

// Reactive subscription
const unsubscribe = i18n.subscribe(() => {
  renderUI(); // re-render on locale change
});
```

## Features

- **Nested keys** — `'nav.home'` dot-notation access into nested message objects
- **Interpolation** — `{name}`, `{user.name}`, `{items[0]}`, `{items|and}`, `{items| / }`
- **Pluralisation** — `Intl.PluralRules`-based `zero/one/two/few/many/other` forms
- **Async loading** — `load()` and `addLoader()` for lazy locale bundles
- **Fallback chain** — walks `locale → lang-root → fallback(s)` for missing keys
- **Scoped** — `scoped(locale)` translates in another locale without changing the active one
- **Formatting** — `number()` and `date()` backed by `Intl`
- **Subscriptions** — reactive updates when locale changes
- **Key checking** — `has(key, locale?)` / `hasLocale(locale)` to test presence
- **Zero dependencies** — <PackageInfo package="i18nit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Locale setup, interpolation, pluralisation, async loading, and subscriptions |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world i18n patterns and framework integrations |
