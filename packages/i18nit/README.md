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
      items: '{count} item | {count} items',
    },
    de: {
      greeting: 'Hallo, {name}!',
      items: '{count} Element | {count} Elemente',
    },
  },
});

i18n.t('greeting', { name: 'Alice' });   // "Hello, Alice!"
i18n.t('items', { count: 1 });            // "1 item"
i18n.t('items', { count: 3 });            // "3 items"

i18n.setLocale('de');
i18n.t('greeting', { name: 'Alice' });   // "Hallo, Alice!"
```

## Features

- ✅ **Variable interpolation** — `{variable}` placeholders in messages
- ✅ **Pluralisation** — `singular | plural` separated by pipe
- ✅ **Namespaces** — scope messages with `i18n.namespace(ns)`
- ✅ **Lazy loaders** — async `loaders` for on-demand locale loading
- ✅ **Fallback locale** — fallback to another locale when a key is missing
- ✅ **Key existence check** — `has(key, locale?)` before translating
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
    en: { files: '{count} file | {count} files' },
  },
});

i18n.t('files', { count: 1 }); // "1 file"
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

await i18n.setLocale('fr');  // loads fr.json on demand
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
| `locale` | `string` | Active locale |
| `fallback` | `string` | Fallback locale for missing keys |
| `messages` | `Record<locale, Messages>` | Static message bundles |
| `loaders` | `Record<locale, () => Promise<Messages>>` | Async locale loaders |
| `escape` | `boolean` | HTML-escape interpolated values |

### `I18n` Methods

| Method | Description |
|---|---|
| `t(key, vars?, opts?)` | Translate a key with optional variables |
| `setLocale(locale)` | Switch the active locale (async if loader needed) |
| `getLocale()` | Get the current locale string |
| `namespace(ns)` | Return a namespaced translator |
| `has(key, locale?)` | Check if a key exists |
| `subscribe(handler)` | Subscribe to locale changes — returns unsubscribe |

## Documentation

Full docs at **[vielzeug.dev/i18nit](https://vielzeug.dev/i18nit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/i18nit/usage) | Locales, namespaces, pluralisation |
| [API Reference](https://vielzeug.dev/i18nit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/i18nit/examples) | Real-world i18n patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
