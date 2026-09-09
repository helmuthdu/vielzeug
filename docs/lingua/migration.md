---
title: Lingua 3.0 Migration
---

# Lingua 3.0 Migration

Lingua 3.0 simplifies the constructor surface to two entry points and adds explicit failure defaults.

## Summary of changes

| Before | After |
| --- | --- |
| `createCatalogTranslator(catalog, { locale })` | `createTranslator(catalog, { locale })` |
| `createTranslator(catalogs, { locale, fallback })` | Removed — use `createI18n` for multi-locale |
| `createTranslationStore({ catalogs, locale })` | `createI18n({ catalogs, locale, loadCatalog? })` |
| `hydrateTranslationStore(state)` | `createI18n({ state })` |
| `TranslationStore` / `TranslationSnapshot` | `I18n` / `I18nSnapshot` |
| `segments()` / `segmentsDynamic()` | `parts()` / `partsDynamic()` |
| `onMissingKey` / `onMissingValue` options | `missing: 'throw' \| 'key' \| handler` |
| `@vielzeug/lingua/format` (`createFormatter`) | Retained as an optional standalone Intl facade |
| `TranslationState` version `3` | version `4` |
| `LinguaMissingResourceError` (2.x) | `LinguaMissingCatalogError` (unchanged from 2.x) |
| — | `LinguaMissingKeyError`, `LinguaMissingValueError` (new) |

## Replace constructor calls

```ts
// Before — fixed catalog
const translator = createCatalogTranslator(catalog, { locale: 'fr' });

// After
const translator = createTranslator(catalog, { locale: 'fr' });
```

```ts
// Before — locale-keyed catalogs
const translator = createTranslator({ en: enCatalog, fr: frCatalog }, { locale: 'fr', fallback: 'en' });

// After — eager catalogs preserve synchronous translation and fallback
const i18n = createI18n({
  catalogs: { en: enCatalog, fr: frCatalog },
  locale: 'fr',
  fallback: 'en',
});
i18n.translate('key');
```

```ts
// Before — mutable store
const i18n = createTranslationStore({ catalogs: { en: enCatalog, fr: async () => frCatalog }, locale: 'en' });

// After
const i18n = createI18n({
  catalogs: { en: enCatalog },
  locale: 'en',
  loadCatalog: (locale) => import(`./locales/${locale}`).then((m) => m.default),
});
```

```ts
// Before — hydration
const client = hydrateTranslationStore(server.serialize());

// After
const client = createI18n({ state: server.serialize() });
```

## Replace segments with parts

`segments()` returned mixed primitive arrays. `parts()` returns a typed discriminated union.

```ts
// Before
const segs = translator.segments('error', { values: { retry } });
// ['Try ', { href: '/retry' }, '.']

// After
const parts = translator.parts('error', { values: { retry } });
// [
//   { type: 'text', value: 'Try ' },
//   { type: 'value', value: { href: '/retry' } },
//   { type: 'text', value: '.' },
// ]
```

## Replace missing handlers

```ts
// Before
createTranslator(catalog, { onMissingKey: (key) => `[${key}]`, onMissingValue: (name) => `<${name}>` });

// After
createTranslator(catalog, { missing: ({ key, name }) => (name ? `<${name}>` : `[${key}]`) });
```

## Keep or replace the format subpath

`@vielzeug/lingua/format` remains available when a shared, cached Intl facade improves application code. Direct `Intl` usage remains appropriate for isolated formatting.

```ts
// Before
import { createFormatter } from '@vielzeug/lingua/format';
const fmt = createFormatter(() => i18n.locale);
fmt.currency(9.99, 'USD');

// After
new Intl.NumberFormat(i18n.locale, { style: 'currency', currency: 'USD' }).format(9.99);
```

## Bump state version

`TranslationState` version changed from `3` to `4`. Re-serialize server state before hydrating clients with the new API.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for the full catalog, translator, and i18n contracts.
