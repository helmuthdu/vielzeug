---
title: I18nit — API Reference
description: API reference for the minimal @vielzeug/i18nit runtime.
---

# I18nit API Reference

[[toc]]

## API At a Glance

| Symbol          | Purpose                                           | Execution mode | Common gotcha                                    |
| --------------- | ------------------------------------------------- | -------------- | ------------------------------------------------ |
| `createI18n`    | Create translation runtime and catalog store      | Sync           | Generic over message shape for typed key inference |
| `t`             | Translate key with interpolation and context      | Sync           | Missing key returns `onMissing(key, locale)`     |
| `tp`            | Translate plural namespace with explicit `count`  | Sync           | Add `{ ordinal: true }` for ordinal plural rules |
| `setLocale`     | Strict locale switch                              | Async          | Throws if locale is unavailable                  |
| `preload`       | Best-effort locale preload                        | Async          | Never throws; loader errors only hit diagnostics |
| `mergeCatalog`  | Deep-merge into existing locale catalog           | Sync           | Preserves keys not present in the incoming object |
| `format`        | Unified locale-aware formatting                   | Sync           | Use the `kind` discriminator                     |

## Package Entry Point

| Import             | Purpose                    |
| ------------------ | -------------------------- |
| `@vielzeug/i18nit` | Main runtime API and types |

## Types

Core exported types:

- `Locale`, `Vars`, `Messages`, `Loader`, `Unsubscribe`
- `LocaleChangeReason`, `LocaleChangeEvent`
- `FormatKind`, `FormatInput`
- `DurationValue`, `DurationFormatOptions`
- `MessageLeafKeys<M>`, `MessageBranchKeys<M>`
- `DiagnosticEvent`
- `I18nOptions<M>`, `I18n<M>`

Supporting runtime exports:

- `createI18n`
- `isLoaderError`
- `isSubscriberError`

## createI18n

Signature: `createI18n<M extends Messages>(config?: I18nOptions<M>): I18n<M>`

Creates an `I18n` instance. The generic parameter `M` is inferred from `config.messages`, making `t` and `tp` accept only valid dot-notation keys from your message schema — no code generation required.

Options:

| Option         | Type                       | Description                                  |
| -------------- | -------------------------- | -------------------------------------------- |
| `locale`       | `Locale`                   | Initial locale (default `en`)                |
| `fallback`     | `Locale \| Locale[]`       | Fallback locale chain                        |
| `catalogs`     | `Record<Locale, M \| Loader<M>>` | Static catalogs and/or async loaders keyed by locale |
| `onMissing`    | `(key, locale) => string`  | Missing-key resolver                         |
| `onDiagnostic` | `(event) => void`          | Diagnostic sink for subscriber/loader errors |

```ts
import { createI18n } from '@vielzeug/i18nit';

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  catalogs: {
    en: { greeting: 'Hello, {name}!' },
    de: () => import('./de.json').then((m) => m.default),
  },
});

// TypeScript infers valid keys from the catalogs object
i18n.t('greeting', { name: 'Alice' });
```

## I18n Interface

### Locale and Catalogs

- `locale` (readonly): active locale
- `loadedLocales`: loaded catalog locales
- `loadableLocales`: locales with registered loaders
- `setCatalog(locale, messages)`: replace locale catalog
- `setLoader(locale, loader)`: register/replace loader

### Translation

- `t(key, vars?)`: translate key; use dot-notation for context sub-keys (`t('invite.female')`)
- `tp(key, count, vars?, ordinal?)`: plural translation; pass `true` as the fourth argument for ordinal rules
- `has(key)`: key exists in active locale chain

```ts
// dot-notation context sub-key
i18n.t('invite.female');

// ordinal plural
i18n.tp('position', 1, undefined, true); // '1st place'
i18n.tp('position', 2, undefined, true); // '2nd place'
```

### Catalog Management

- `setCatalog(locale, messages)`: fully replace locale catalog
- `mergeCatalog(locale, messages)`: deep-merge `messages` into the existing catalog; keys not present in the incoming object are preserved
- `setLoader(locale, loader)`: register/replace async loader

### Loading

- `setLocale(locale)`: strict locale switch (throws if missing)
- `preload(locale)`: best-effort preload (never throws)

### Formatting

- `format({ kind: 'number', value, options? })`
- `format({ kind: 'currency', value, currency, options? })`
- `format({ kind: 'date', value, options? })`
- `format({ kind: 'relative', value, unit, options? })`
- `format({ kind: 'list', value, options?: { style?: 'long' | 'short' | 'narrow', type?: 'and' | 'or' } })`
- `format({ kind: 'duration', value: DurationValue, options?: DurationFormatOptions })`

#### `DurationValue`

An object with any subset of the following numeric fields:

```ts
type DurationValue = Partial<Record<
  'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' |
  'milliseconds' | 'microseconds' | 'nanoseconds',
  number
>>;
```

#### `DurationFormatOptions`

```ts
type DurationFormatOptions = {
  style?: 'digital' | 'long' | 'narrow' | 'short';
  hours?: 'numeric' | '2-digit';
  minutes?: 'numeric' | '2-digit';
  seconds?: 'numeric' | '2-digit';
  milliseconds?: 'numeric';
  nanoseconds?: 'numeric';
};
```

Uses `Intl.DurationFormat` when available; falls back to a compact abbreviated string (e.g. `1h 30m`) in environments without it.

### Subscription and Lifecycle

- `subscribe(listener, immediate?) => Unsubscribe`
- `dispose()`
- `[Symbol.dispose]()`

`subscribe(listener, true)` emits `{ locale, reason: 'init' }` immediately.

## Typed Key Inference

`createI18n` is generic over the message shape. Keys are inferred as dot-notation paths at up to 7 levels of nesting with no code generation step.

```ts
const i18n = createI18n({
  messages: {
  catalogs: {
    en: {
      nav: { home: 'Home', about: 'About' },
      inbox: { one: 'One message', other: '{count} messages', zero: 'No messages' },
    },
  },
});

// valid leaf keys
i18n.t('nav.home');
i18n.t('nav.about');

// valid branch key for tp()
i18n.tp('inbox', 5);

// TypeScript error: not a key in the schema
i18n.t('nav.missing');
```

Exported helpers for building generic utilities:

- `MessageLeafKeys<M>` — union of all dot-notation paths that resolve to a `string`
- `MessageBranchKeys<M>` — union of all paths that resolve to a nested object (valid for `tp`)

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
- Plural resolution uses `Intl.PluralRules` in `tp()` and tries `zero` first for `count === 0` (cardinal only).
- Ordinal plural uses `Intl.PluralRules` with `type: 'ordinal'`; pass `true` as the fourth arg to `tp()`.
- Context sub-keys are reached via dot-notation directly: `t('invite.female')`.
- `mergeCatalog()` deep-merges, so existing keys not in the incoming object are preserved.
- `setCatalog()` fully replaces the catalog for that locale.
- `setLocale()` is strict and rejects if the locale cannot be loaded.
- `preload()` is best-effort: it never rejects and routes loader failures to `onDiagnostic`.
- `subscribe(listener, immediate)` emits `reason: 'init'` when `immediate=true` to distinguish initialization from locale changes.
- `[Symbol.dispose]` requires Explicit Resource Management support (Node 20.4+, TypeScript 5.2+).
- After `dispose()`, mutating/loading methods throw: `setCatalog`, `mergeCatalog`, `setLoader`, `preload`, `setLocale`, `subscribe`.

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
