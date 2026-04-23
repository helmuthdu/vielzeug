---
title: I18nit — API Reference
description: API reference for the minimal @vielzeug/i18nit runtime.
---

# I18nit API Reference

[[toc]]

## API At a Glance

| Symbol       | Purpose                                           | Execution mode | Common gotcha                                 |
| ------------ | ------------------------------------------------- | -------------- | --------------------------------------------- |
| `createI18n` | Create translation runtime and catalog store      | Sync           | Messages are string-only leaves               |
| `t`          | Translate key with interpolation                  | Sync           | Missing key returns `onMissing(key, locale)`  |
| `tp`         | Translate plural namespace with explicit `count`  | Sync           | Uses `key.zero/one/two/few/many/other` keys   |
| `setLocale`  | Strict locale switch                              | Async          | Throws if locale is unavailable               |
| `preload`    | Tolerant locale preload                           | Async          | Never throws when loader is missing           |
| `format`     | Unified locale-aware formatting                   | Sync           | Use `kind` discriminator in input object      |

## Package Entry Point

| Import             | Purpose                    |
| ------------------ | -------------------------- |
| `@vielzeug/i18nit` | Main runtime API and types |

## Types

Core exported types:

- `Locale`, `Vars`, `Messages`, `Loader`, `Unsubscribe`
- `LocaleChangeReason`, `LocaleChangeEvent`
- `FormatKind`, `FormatInput`
- `DiagnosticEvent`
- `I18nOptions`, `I18n`

## createI18n

Signature: `createI18n(config?: I18nOptions): I18n`

Creates an `I18n` instance.

Options:

| Option         | Type                     | Description                                  |
| -------------- | ------------------------ | -------------------------------------------- |
| `locale`       | `Locale`                 | Initial locale (default `en`)                |
| `fallback`     | `Locale \| Locale[]`     | Fallback locale chain                        |
| `messages`     | `Record<string,Messages>`| Preloaded catalogs                           |
| `loaders`      | `Record<Locale, Loader>` | Async locale loaders                         |
| `onMissing`    | `(key, locale) => string`| Missing-key resolver                         |
| `onDiagnostic` | `(event) => void`        | Diagnostic sink for subscriber/loader errors |

## I18n Interface

### Locale and Catalogs

- `locale` (readonly): active locale
- `locales`: loaded catalog locales
- `loadableLocales`: locales with registered loaders
- `setCatalog(locale, messages)`: replace locale catalog
- `setLoader(locale, loader)`: register/replace loader

### Translation and Lookup

- `t(key, vars?)`: translate key
- `tp(key, count, vars?)`: plural translation from key namespace
- `has(key)`: key exists in active locale chain

### Loading

- `setLocale(locale)`: strict locale switch (throws if missing)
- `preload(locale)`: tolerant preload (no throw if missing)

### Formatting

- `format({ kind: 'number', value, options? })`
- `format({ kind: 'currency', value, currency, options? })`
- `format({ kind: 'date', value, options? })`
- `format({ kind: 'relative', value, unit, options? })`
- `format({ kind: 'list', value, options?: { type?: 'and' | 'or' } })`

### Subscription and Lifecycle

- `subscribe(listener, immediate?) => Unsubscribe`
- `dispose()`
- `[Symbol.dispose]()`
- `[Symbol.asyncDispose]()`

## Type Guards

- `isLoaderError(event)` narrows `DiagnosticEvent` to loader failures.
- `isSubscriberError(event)` narrows `DiagnosticEvent` to subscriber failures.

```ts
import { isLoaderError, isSubscriberError, type DiagnosticEvent } from '@vielzeug/i18nit';

function handleDiagnostic(event: DiagnosticEvent) {
  if (isLoaderError(event)) {
    console.warn(event.locale, event.error);
    return;
  }

  if (isSubscriberError(event)) {
    console.error(event.error);
  }
}
```

## Runtime Semantics

- Missing key: returns `onMissing(key, locale)` (default is identity).
- Fallback chain: active locale -> BCP47 ancestors -> configured fallback locales.
- Plural resolution uses `Intl.PluralRules` in `tp()` and tries `zero` first for `count === 0`.
- `setLocale()` is strict and rejects if the locale cannot be loaded.
- `preload()` is tolerant and never rejects for missing loaders.
- Subscriber errors and loader errors route through `onDiagnostic` (or console defaults).
- After `dispose()`, mutating/loading methods throw: `setCatalog`, `setLoader`, `preload`, `setLocale`, `subscribe`.

## Message Shape

`Messages` is recursive and string-leaf based:

```ts
type Messages = { [key: string]: string | Messages };
```

Plural branches are represented as nested keys and resolved through `tp()`:

```ts
const messages = {
  en: {
    inbox: {
      one: 'One message',
      other: '{count} messages',
      zero: 'No messages',
    },
  },
};
```
