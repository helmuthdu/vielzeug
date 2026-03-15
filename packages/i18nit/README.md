# @vielzeug/i18nit

> Lightweight type-safe i18n with nested keys, lazy loaders, batch updates, and reactive subscriptions

[![npm version](https://img.shields.io/npm/v/@vielzeug/i18nit)](https://www.npmjs.com/package/@vielzeug/i18nit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**i18nit** is a minimal, zero-dependency i18n library: define messages as typed objects, translate with variable interpolation and pluralisation, load locale bundles lazily, batch catalog updates, and react to locale changes.

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
i18n.t('nav.home');                     // "Home" (fallback)
```

## Features

- ✅ **Variable interpolation** — `{var}`, `{obj.prop}`, `{arr[0]}`, `{arr|and}`, `{arr| - }`
- ✅ **Pluralisation** — `Intl.PluralRules`-based with `zero/one/two/few/many/other`
- ✅ **Nested keys** — dot-notation access for organised message trees
- ✅ **Message management** — `add()` deep-merges, `replace()` swaps the catalog, `reload()` force-refreshes
- ✅ **Batch updates** — `batch()` collapses multiple catalog changes into a single subscriber notification
- ✅ **Scope** — key-prefix scoping with `scope(ns)` — compile-time error on leaf keys
- ✅ **Locale-bound translation** — `withLocale(locale)` translates without changing the active locale
- ✅ **Formatting helpers** — `number()`, `date()`, `list()`, `relative()`, `currency()` via `Intl`
- ✅ **Async loading** — `registerLoader()` + `setLocale()` for on-demand locale bundles
- ✅ **Full BCP47 cascade** — `sr-Latn-RS → sr-Latn → sr → fallbacks`
- ✅ **Fallback chain** — walks `locale → BCP47 ancestors → fallback(s)` for missing keys
- ✅ **Reactive subscriptions** — `subscribe()` + `batch()` + `dispose()` for locale-change notifications
- ✅ **Type-safe keys** — `TranslationKeyParam<T>` for dot-notation autocompletion
- ✅ **Disposable** — `using` and `await using` for deterministic resource release
- ✅ **Zero dependencies** — pure TypeScript, no external dependencies

## Usage

### Variable Interpolation

```typescript
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      welcome: 'Welcome, {name}! You have {count} messages.',
      tagged: 'Tagged with: {items|and}',
    },
  },
});

i18n.t('welcome', { name: 'Alice', count: 5 });
// "Welcome, Alice! You have 5 messages."

i18n.t('tagged', { items: ['TypeScript', 'i18n', 'DX'] });
// "Tagged with: TypeScript, i18n, and DX"
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

### Scope

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

const auth = i18n.scope('auth');
auth.t('login');   // "Log in"
auth.t('logout');  // "Log out"
// auth.t('nav.home') would be a TypeScript compile-time error — 'auth' contains no 'nav' key
```

### Batch Updates

`batch()` defers subscriber notifications until all catalog changes inside the callback complete, then fires exactly once. Useful when hydrating multiple locale bundles at startup or loading code-split chunks.

```typescript
i18n.batch(() => {
  i18n.add('en', chunkA);
  i18n.add('en', chunkB);
  i18n.add('en', chunkC);
});
// Subscribers notified once — not three times
```

### Async Loading

```typescript
const i18n = createI18n({
  locale: 'en',
  loaders: {
    fr: () => import('./locales/fr.json'),
    ja: () => import('./locales/ja.json'),
  },
});

// Load and switch atomically
await i18n.setLocale('fr');
i18n.t('greeting'); // translated in French

// Register a loader dynamically after creation
i18n.registerLoader('de', () => import('./locales/de.json'));
await i18n.setLocale('de');

// Force-reload (e.g. after a hot-reload or bundle update)
await i18n.reload('en');
```

### Subscriptions

```typescript
const unsub = i18n.subscribe(({ locale, reason }) => {
  console.log(`Locale: ${locale}, reason: ${reason}`);
  rerender();
});

// Fire immediately with the current locale
const unsub2 = i18n.subscribe(({ locale }) => init(locale), true);

// Remove subscriptions
unsub();

// Deterministic cleanup with `using` / `await using`
{
  using i18n = createI18n({ locale: 'en', messages: { en } });
  // ... use i18n
} // dispose() called automatically
```

## API

**Configuration**

| Option | Type | Description |
|---|---|---|
| `locale` | `string` | Active locale (default: `'en'`) |
| `fallback` | `string \| string[]` | Fallback locale(s) for missing keys |
| `messages` | `Record<string, Messages \| DeepPartialMessages<T>>` | Static message bundles |
| `loaders` | `Record<string, Loader>` | Async locale loaders |
| `onMissing` | `(key, locale) => string \| undefined` | Custom handler for missing keys |
| `onDiagnostic` | `(event: DiagnosticEvent) => void` | Receives `subscriber-error` and `loader-error` events |

**I18n Instance**

| Member | Description |
|---|---|
| `locale` (property) | Get or set the active locale |
| `locales` (property) | Array of all loaded locale keys |
| `loadableLocales` (property) | Locales that have a registered loader |
| `setLocale(locale)` | Load the locale (if needed) then switch atomically |
| `add(locale, messages)` | Deep-merge messages into the catalog |
| `replace(locale, messages)` | Replace the entire locale catalog (shallow copy) |
| `reload(locale)` | Force-reload a locale via its registered loader |
| `batch(fn)` | Defer subscriber notifications across all catalog changes in `fn` |
| `t(key, vars?)` | Translate a key with optional interpolation variables |
| `has(key)` | Check if a translation key exists in the active locale (with fallback) |
| `hasOwn(key)` | Check if the active locale has its own translation (no fallback) |
| `hasLocale(locale)` | Check if a locale catalog is loaded |
| `number(value, options?)` | Format a number via `Intl.NumberFormat` |
| `date(value, options?)` | Format a date via `Intl.DateTimeFormat` |
| `list(items, type?)` | Format an array as `'and'` or `'or'` list via `Intl.ListFormat` |
| `relative(value, unit, options?)` | Format a relative time via `Intl.RelativeTimeFormat` |
| `currency(value, currency, options?)` | Format a currency value |
| `scope(ns)` | Return a key-prefix–scoped bound translator (namespace keys only) |
| `withLocale(locale)` | Return a locale-bound translator (no active locale change) |
| `registerLoader(locale, loader)` | Register an async loader dynamically |
| `load(...locales)` | Load one or more locales via their registered loaders |
| `subscribe(handler, immediate?)` | Subscribe to locale changes — returns unsubscribe |
| `dispose()` | Release all resources |
| `[Symbol.dispose]()` | Alias for `dispose()` — enables the `using` keyword |
| `[Symbol.asyncDispose]()` | Drains in-flight loaders then disposes — enables `await using` |

## Documentation

Full docs at **[vielzeug.dev/i18nit](https://vielzeug.dev/i18nit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/i18nit/usage) | Locales, interpolation, pluralisation, batching |
| [API Reference](https://vielzeug.dev/i18nit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/i18nit/examples) | Real-world i18n patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.


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
i18n.t('nav.home');                     // "Home" (fallback)
```

## Features

- ✅ **Variable interpolation** — `{var}`, `{obj.prop}`, `{arr[0]}`, `{arr|and}`, `{arr| - }`
- ✅ **Pluralisation** — `Intl.PluralRules`-based with `zero/one/two/few/many/other`
- ✅ **Nested keys** — dot-notation access for organised message trees
- ✅ **Message management** — `add()` deep-merges, `replace()` swaps the catalog, `has()` checks presence
- ✅ **Scope** — key-prefix scoping with `scope(ns)`
- ✅ **Locale-bound translation** — `withLocale(locale)` translates without changing the active locale
- ✅ **Formatting helpers** — `number()`, `date()`, `list()`, `relative()`, `currency()` via `Intl`
- ✅ **Async loading** — `registerLoader()` + `setLocale()` for on-demand locale bundles
- ✅ **Fallback chain** — walks `locale → lang-root → fallback(s)` for missing keys
- ✅ **Reactive subscriptions** — `subscribe()` + `dispose()` for locale-change notifications
- ✅ **Type-safe keys** — `TranslationKey<T>` for dot-notation autocompletion
- ✅ **Zero dependencies** — pure TypeScript, no external dependencies

## Usage

### Variable Interpolation

```typescript
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      welcome: 'Welcome, {name}! You have {count} messages.',
      tagged: 'Tagged with: {items|and}',
    },
  },
});

i18n.t('welcome', { name: 'Alice', count: 5 });
// "Welcome, Alice! You have 5 messages."

i18n.t('tagged', { items: ['TypeScript', 'i18n', 'DX'] });
// "Tagged with: TypeScript, i18n, and DX"
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

### Scope

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

const auth = i18n.scope('auth');
auth.t('login');   // "Log in"
auth.t('logout');  // "Log out"
```

### Async Loading

```typescript
const i18n = createI18n({
  locale: 'en',
  loaders: {
    fr: () => import('./locales/fr.json'),
    ja: () => import('./locales/ja.json'),
  },
});

// Load and switch atomically
await i18n.setLocale('fr');
i18n.t('greeting'); // translated in French

// Register a loader dynamically after creation
i18n.registerLoader('de', () => import('./locales/de.json'));
await i18n.setLocale('de');
```

### Subscriptions

```typescript
const unsub = i18n.subscribe((locale) => {
  console.log('Locale changed to:', locale);
  rerender();
});

// Fire immediately with the current locale
const unsub2 = i18n.subscribe((locale) => updateUI(locale), true);

// Remove the subscription
unsub();
```

## API

**Configuration**

| Option | Type | Description |
|---|---|---|
| `locale` | `string` | Active locale (default: `'en'`) |
| `fallback` | `string \| string[]` | Fallback locale(s) for missing keys |
| `messages` | `Record<string, Messages>` | Static message bundles |
| `loaders` | `Record<string, Loader>` | Async locale loaders |
| `onMissing` | `(key, locale) => string \| undefined` | Custom handler for missing keys |

**I18n Instance**

| Member | Description |
|---|---|
| `locale` (property) | Get or set the active locale |
| `locales` (property) | Array of all loaded locale keys |
| `setLocale(locale)` | Load the locale (if needed) then switch atomically |
| `add(locale, messages)` | Deep-merge messages into the catalog |
| `replace(locale, messages)` | Replace the entire locale catalog |
| `t(key, vars?)` | Translate a key with optional interpolation variables |
| `has(key, locale?)` | Check if a translation key exists |
| `hasLocale(locale)` | Check if a locale catalog is loaded |
| `number(value, options?)` | Format a number via `Intl.NumberFormat` |
| `date(value, options?)` | Format a date via `Intl.DateTimeFormat` |
| `list(items, type?)` | Format an array as `'and'` or `'or'` list via `Intl.ListFormat` |
| `relative(value, unit, options?)` | Format a relative time via `Intl.RelativeTimeFormat` |
| `currency(value, currency, options?)` | Format a currency value |
| `scope(ns)` | Return a key-prefix–scoped bound translator |
| `withLocale(locale)` | Return a locale-bound translator (no active locale change) |
| `registerLoader(locale, loader)` | Register an async loader dynamically |
| `load(...locales)` | Load one or more locales via their registered loaders |
| `subscribe(handler, immediate?)` | Subscribe to locale changes — returns unsubscribe |
| `dispose()` | Remove all subscribers |

## Documentation

Full docs at **[vielzeug.dev/i18nit](https://vielzeug.dev/i18nit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/i18nit/usage) | Locales, interpolation, pluralisation |
| [API Reference](https://vielzeug.dev/i18nit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/i18nit/examples) | Real-world i18n patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
