---
title: I18nit — API Reference
description: API reference for @vielzeug/i18nit.
---

[[toc]]

## createI18n

Signature: `createI18n<M extends Messages>(options?: I18nOptions<M>): I18n<M>`

### Options

| Option | Type | Description |
| --- | --- | --- |
| `locale` | `string` | Active locale at startup. Default: `'en'`. |
| `fallback` | `string \| string[]` | Fallback locale chain. |
| `catalogs` | `Record<string, M \| Loader<M>>` | Locale source registry. Each value is static messages or a loader. |
| `onMissing` | `(info: MissingInfo) => string` | Missing value hook for keys and vars. |

## I18n Interface

- `t(key, options?)`
- `preload(locale)`
- `setLocale(locale)`
- `register(locale, source)`
- `has(key)`
- `getSupportedLocales({ sorted? })`
- `getSnapshot()`
- `subscribe(listener, { immediate? })`
- `locale` (readonly)

## TranslateOptions

```ts
type TranslateOptions = {
  count?: number;
  ordinal?: boolean;
  vars?: Record<string, unknown>;
};
```

Rules:

- If `count` is absent, `t()` resolves a string leaf key.
- If `count` is present, `t()` resolves plural forms (`.zero` fallback, then CLDR category, then `.other`).
- Missing interpolation variables call `onMissing({ type: 'var', ... })`.

## Store Integration

`getSnapshot()` returns `{ locale, version }`.

`subscribe(listener)` is store-style and framework-agnostic. It emits on locale/content changes and returns `Unsubscribe`.

## createFormatter

Import: `import { createFormatter } from '@vielzeug/i18nit/format'`

Signature:

`createFormatter(source: string | { locale: string } | { getSnapshot(): { locale: string } })`

Methods:

- `number(value, options?)`
- `currency(value, currency, options?)`
- `date(value, options?)`
- `relative(value, unit, options?)`
- `list(value, options?)`
- `duration(value, options?)`
