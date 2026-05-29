---
title: Lingua — API Reference
description: API reference for @vielzeug/lingua.
---

[[toc]]

## Package Entry Point

| Import               | Purpose                |
| -------------------- | ---------------------- |
| `@vielzeug/lingua`   | Main exports and types |

## API At a Glance

| Symbol              | Purpose                                      | Mode  | Common gotcha                                 |
| ------------------- | -------------------------------------------- | ----- | --------------------------------------------- |
| `createI18n()`      | Create an i18n instance with locale catalogs | Sync  | Catalogs are lazy; call `preload()` for SSR   |
| `i18n.t()`          | Translate a leaf key with optional vars      | Sync  | Missing keys use `onMissing` or return key    |
| `i18n.tp()`         | Translate a plural branch key                | Sync  | `count` must be finite; `vars.count` is kept  |
| `i18n.setLocale()`  | Switch active locale                         | Async | Await before rendering translated content     |
| `i18n.preload()`    | Pre-load a locale catalog                    | Async | Locale must be registered                     |
| `createFormatter()` | Create a standalone Intl formatter           | Sync  | Locale changes require a new formatter read   |

## createI18n

Signatures:

- `createI18n<M extends Messages>(options: I18nOptions<M>): I18n<M>`
- `createI18n(options?: I18nOptions<Messages>): I18n<Messages>`

### Options

| Option              | Type                             | Description                                                                   |
| ------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `locale`            | `string`                         | Active locale at startup. Default: `'en'`.                                    |
| `fallback`          | `string \| string[]`             | Fallback locale chain.                                                        |
| `catalogs`          | `Record<string, M \| Loader<M>>` | Locale source registry. Each value is static messages or a loader.            |
| `onMissing`         | `(info: MissingInfo) => string`  | Called for missing keys and missing interpolation vars.                       |
| `onSubscriberError` | `(error: unknown) => void`       | Called when a `subscribe` callback throws. Default: silently discards errors. |

## I18n Interface

- `t(key, vars?)`
- `tp(key, count, options?)`
- `preload(locale)`
- `setLocale(locale)`
- `register(locale, source)`
- `has(leafKey)`
- `getSupportedLocales(options?)` — returns locales in insertion order; `{ sorted: true }` gives code-point-sorted output
- `getSnapshot()`
- `subscribe(callback, options?)` — callback receives `snapshot`; `{ immediate: true }` calls immediately
- `locale` (readonly)

## Translate Options

`t(key, vars?)` resolves leaf keys.

`tp(key, count, options?)` resolves plural branches (`.zero` fallback, then CLDR category, then `.other`).

Rules:

- `count` must be finite.
- `vars.count` is reserved and not allowed in `tp()`.
- Missing interpolation variables call `onMissing({ type: 'var', ... })`. By default, unresolved vars keep the original placeholder.

## Store Integration

`getSnapshot()` returns `{ locale, version }`.

`subscribe(callback, options?)` is framework-agnostic. It emits on locale/content changes and returns `Unsubscribe`.
Use `{ immediate: true }` when you need an immediate first value (for example Svelte-readable style usage).

## createFormatter

Import: `import { createFormatter } from '@vielzeug/lingua/format'`

Signature:

`createFormatter(source: string | (() => string) | { locale: string })`

Pass a string for a static locale, a getter function for any reactive primitive (Vue `ref.value`, Solid signal `[locale]`, Svelte store `get(store)`), or an object with a `locale` property.

Methods:

- `number(value, options?)`
- `currency(value, currency, options?)`
- `date(value, options?)`
- `relative(value, unit, options?)`
- `list(value, options?)`
- `duration(value, options?)`
