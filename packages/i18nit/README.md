# @vielzeug/i18nit

> Lightweight type-safe internationalisation with namespaces, dynamic loaders, and reactive subscriptions

[![npm version](https://img.shields.io/npm/v/@vielzeug/i18nit)](https://www.npmjs.com/package/@vielzeug/i18nit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**i18nit** is a minimal i18n library: define messages as typed objects, translate with variable interpolation and pluralisation, load locale bundles lazily, and react to locale changes — no external dependencies.

## Installation

```sh
pnpm add @vielzeug/i18nit
# npm install @vielzeug/i18nit
# yarn add @vielzeug/i18nit
```

## Quick Start

```typescript
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      items: { one: 'One item', other: '{count} items' },
      nav: { home: 'Home', about: 'About' },
    },
    de: {
      greeting: 'Hallo, {name}!',
      items: { one: 'Ein Element', other: '{count} Elemente' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('nav.home');                     // "Home"
i18n.t('items', { count: 1 });          // "One item"
i18n.t('items', { count: 3 });          // "3 items"

i18n.locale = 'de';
i18n.t('greeting', { name: 'Alice' }); // "Hallo, Alice!"
```

## Features

- ✅ **Variable interpolation** — `{var}`, `{obj.prop}`, `{arr[0]}`, `{arr|and}`
- ✅ **Pluralisation** — `Intl.PluralRules`-based with `zero/one/two/few/many/other`
- ✅ **Nested keys** — dot-notation access for organised message trees
- ✅ **Namespaces** — scope messages with `i18n.namespace(ns)`
- ✅ **Lazy loaders** — async `loaders` for on-demand locale loading
- ✅ **Fallback chain** — walk `locale → lang-root → fallback(s)` for missing keys
- ✅ **Scoped translation** — `scoped(locale)` to translate without changing active locale
- ✅ **Formatting helpers** — `number()` and `date()` backed by `Intl`
- ✅ **Reactive** — subscribe to locale changes with `subscribe()`
- ✅ **Framework-agnostic** — works with any UI framework

## Usage

### Variable Interpolation

```typescript
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      welcome: 'Welcome back, {name}! You have {count} messages.',
    },
  },
});

i18n.t('welcome', { name: 'Alice', count: 5 });
// "Welcome back, Alice! You have 5 messages."
```

### Pluralisation

```typescript
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      files: { zero: 'No files', one: 'One file', other: '{count} files' },
    },
  },
});

i18n.t('files', { count: 0 }); // "No files"
i18n.t('files', { count: 1 }); // "One file"
i18n.t('files', { count: 2 }); // "2 files"
```

### Namespaces

```typescript
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      auth: { login: 'Log in', logout: 'Log out' },
      nav:  { home: 'Home', about: 'About' },
    },
  },
});

const auth = i18n.namespace('auth');
auth.t('login');  // "Log in"
```

### Lazy Loaders

```typescript
const i18n = createI18n({
  locale: 'en',
  loaders: {
    fr: () => import('./locales/fr.json'),
    ja: () => import('./locales/ja.json'),
  },
});

await i18n.load('fr');
i18n.locale = 'fr';
i18n.t('greeting');
```

### Subscriptions

```typescript
const unsub = i18n.subscribe((locale) => {
  console.log('Locale changed to:', locale);
  rerender();
});
```

## API

### `createI18n(config?)`

| Config Option | Type | Description |
|---|---|---|
| `locale` | `string` | Active locale (default: `'en'`) |
| `fallback` | `string \| string[]` | Fallback locale(s) for missing keys |
| `messages` | `Record<string, Messages>` | Static message bundles |
| `loaders` | `Record<string, Loader>` | Async locale loaders |

### `I18n` Methods and Properties

| Member | Description |
|---|---|
| `locale` (property) | Get or set the active locale |
| `t(key, vars?)` | Translate a key with optional interpolation variables |
| `number(value, options?, locale?)` | Format a number via `Intl.NumberFormat` |
| `date(value, options?, locale?)` | Format a date via `Intl.DateTimeFormat` |
| `namespace(ns)` | Return a namespaced translator (`t` and `has`) |
| `scoped(locale)` | Return a locale-bound translator without changing active locale |
| `add(locale, messages)` | Deep-merge messages into a locale catalog |
| `replace(locale, messages)` | Replace the entire catalog for a locale |
| `has(key, locale?)` | Check if a translation key exists |
| `hasLocale(locale)` | Check if a locale catalog is loaded |
| `addLoader(locale, loader)` | Register an async loader dynamically |
| `load(locale)` | Load a locale via its registered loader |
| `subscribe(handler)` | Subscribe to locale changes — returns unsubscribe |
| `dispose()` | Remove all subscribers |

## Documentation

Full docs at **[vielzeug.dev/i18nit](https://vielzeug.dev/i18nit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/i18nit/usage) | Locales, namespaces, pluralisation |
| [API Reference](https://vielzeug.dev/i18nit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/i18nit/examples) | Real-world i18n patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
