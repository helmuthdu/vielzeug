---
title: I18nit — API Reference
description: API reference for @vielzeug/i18nit types, factory, instance methods, and bound views.
---

# I18nit API Reference

[[toc]]

## API At a Glance

| Symbol           | Purpose                                         | Execution mode | Common gotcha                                         |
| ---------------- | ----------------------------------------------- | -------------- | ----------------------------------------------------- |
| `createI18n()`   | Create translation runtime and dictionary store | Sync           | Always provide fallback locale/messages               |
| `t()`            | Resolve translated strings with interpolation   | Sync           | Missing keys should be handled in development logging |
| `ensureLocale()` | Load locale dictionaries lazily                 | Async          | Strict mode throws if no loader is registered         |

## Package Entry Points

| Import                  | Purpose                    |
| ----------------------- | -------------------------- |
| `@vielzeug/i18nit`      | Main runtime API and types |
| `@vielzeug/i18nit/core` | Core bundle entry          |

## Types

Core exported types:

- `Locale`, `Unsubscribe`
- `PluralForm`, `PluralMessages`, `MessageValue`, `Messages`
- `Vars`, `Loader`
- `I18nOptions<T>`, `BoundI18n<T>`, `I18n<T>`, `SwitchMode`
- `TranslationKey<T>`, `TranslationKeyParam<T>`, `PluralKeys<T>`, `NamespaceKeys<T>`
- `LocaleChangeReason`, `LocaleChangeEvent`, `LocaleChangeListener`
- `DiagnosticEvent`

Behavior highlights:

- `Messages` is recursive; leaves are `string` or `PluralMessages`.
- `PluralMessages` requires `other`.
- `TranslationKey<T>` resolves dot-notation keys up to depth 8.
- `TranslationKeyParam<T>` falls back to generic string support when needed.
- `scope()` only accepts namespace keys (`NamespaceKeys<T>`).

## createI18n

Signature: `createI18n<T extends Messages = Messages>(config?: I18nOptions<T>): I18n<T>`

Creates an `I18n` instance.

Options:

| Option         | Type                                          | Description                                  |
| -------------- | --------------------------------------------- | -------------------------------------------- |
| `locale`       | `Locale`                                      | Initial locale (default `en`)                |
| `fallback`     | `Locale \| Locale[]`                          | Fallback locale chain                        |
| `messages`     | `Record<string, T \| DeepPartialMessages<T>>` | Preloaded catalogs                           |
| `loaders`      | `Record<Locale, Loader>`                      | Async locale loaders                         |
| `onMissing`    | `(key, locale) => string \| undefined`        | Missing-key resolver                         |
| `onDiagnostic` | `(event: DiagnosticEvent) => void`            | Diagnostic sink for subscriber/loader errors |

## I18n Interface

### Locale and Catalogs

- `locale` (readonly): active locale
- `locales`: loaded catalog locales
- `loadableLocales`: locales with registered loaders
- `hasLocale(locale)`: whether locale catalog is loaded
- `isReady(locale)`: whether locale catalog is loaded

### Translation and Lookup

- `t(key, vars?)`: translate key
- `has(key)`: key exists in active locale chain
- `hasOwn(key)`: key exists in active locale only
- `scope(ns)`: namespace-bound view
- `withLocale(locale)`: locale-bound view

### Catalog Mutation

- `add(locale, messages)`: deep-merge into locale catalog
- `replace(locale, messages)`: replace locale catalog with deep clone
- `batch(fn)`: coalesce notifications triggered during `fn`

### Loading

- `ensureLocale(locale, mode?)`: ensure locale catalog exists (`'strict'` throws when missing loader)
- `switchLocale(locale, mode?)`: ensure locale then switch active locale
- `registerLoader(locale, loader)`: add/replace loader
- `reload(locale)`: clear locale catalog and force loader refresh (throws if no loader)

### Formatting

- `number(value, options?)`
- `date(value, options?)`
- `list(items, type?)`
- `relative(value, unit, options?)`
- `currency(value, currency, options?)`

### Subscription and Lifecycle

- `subscribe(listener, immediate?) => Unsubscribe`
- `dispose()`
- `[Symbol.dispose]()`
- `[Symbol.asyncDispose]()`

## BoundI18n

`BoundI18n<T>` is a translator view returned by `scope()` and `withLocale()`.

Members:

- `locale`
- `t(key, vars?)`
- `has(key)` / `hasOwn(key)`
- `number`, `date`, `list`, `relative`, `currency`
- `scope(ns)`
- `withLocale(locale)`

Notes:

- `withLocale(locale)` does not mutate instance locale.
- `scope(ns)` prefixes keys while keeping full formatter capabilities.

## Runtime Semantics

- Missing key: returns `onMissing?.(key, locale) ?? key`.
- Fallback chain: active locale -> BCP47 ancestors -> configured fallback locales.
- Plural resolution uses `Intl.PluralRules` with `count` (defaults to `0` when missing).
- `switchLocale()` is strict by default and rejects if the locale is unavailable.
- `batch()` is synchronous; async operations inside it notify when they complete.
- Subscriber errors and loader errors route through `onDiagnostic` (or console defaults).
