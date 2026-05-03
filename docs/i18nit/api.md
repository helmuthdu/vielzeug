---
title: I18nit — API Reference
description: API reference for the minimal @vielzeug/i18nit runtime.
---

# I18nit API Reference

[[toc]]

## API At a Glance

| Symbol       | Purpose                                           | Execution mode | Common gotcha                                    |
| ------------ | ------------------------------------------------- | -------------- | ------------------------------------------------ |
| `createI18n` | Create translation runtime and catalog store      | Sync           | Messages are recursive objects with string leaves |
| `t`          | Translate key with interpolation                  | Sync           | Missing key returns `onMissing(key, locale)`     |
| `tp`         | Translate plural namespace with explicit `count`  | Sync           | Plural messages live under `key.zero|one|...`    |
| `setLocale`  | Strict locale switch                              | Async          | Throws if locale is unavailable                  |
| `preload`    | Best-effort locale preload                        | Async          | Never throws; loader errors only hit diagnostics |
| `format`     | Unified locale-aware formatting                   | Sync           | Use the `kind` discriminator                     |

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

Supporting runtime exports:

- `createI18n`
- `isLoaderError`
- `isSubscriberError`

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

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  messages: {
    en: { greeting: 'Hello, {name}!' },
  },
});
```

## I18n Interface

### Locale and Catalogs

- `locale` (readonly): active locale
- `loadedLocales`: loaded catalog locales
- `loadableLocales`: locales with registered loaders
- `setCatalog(locale, messages)`: replace locale catalog
- `setLoader(locale, loader)`: register/replace loader

### Translation and Lookup

- `t(key, vars?)`: translate key
- `tp(key, count, vars?)`: plural translation from key namespace
- `has(key)`: key exists in active locale chain

### Loading

- `setLocale(locale)`: strict locale switch (throws if missing)
- `preload(locale)`: best-effort preload (never throws)

### Formatting

- `format({ kind: 'number', value, options? })`
- `format({ kind: 'currency', value, currency, options? })`
- `format({ kind: 'date', value, options? })`
- `format({ kind: 'relative', value, unit, options? })`
- `format({ kind: 'list', value, options?: { style?: 'long' | 'short' | 'narrow', type?: 'and' | 'or' } })`

### Subscription and Lifecycle

- `subscribe(listener, immediate?) => Unsubscribe`
- `dispose()`
- `[Symbol.dispose]()`
- `[Symbol.asyncDispose]()`

`subscribe(listener, true)` emits `{ locale, reason: 'init' }` immediately.

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
- `preload()` is best-effort: it never rejects and routes loader failures to `onDiagnostic`.
- `subscribe(listener, immediate)` emits `reason: 'init'` when `immediate=true` to distinguish initialization from locale changes.
- `[Symbol.dispose]` / `[Symbol.asyncDispose]` require Explicit Resource Management support (Node 20.4+, TypeScript 5.2+).
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
