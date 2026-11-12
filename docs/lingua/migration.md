---
title: Lingua 3.0 Migration
---

# Lingua 3.0 Migration

Lingua 3.0 simplifies the constructor surface to two entry points and adds explicit failure defaults.

## Summary of changes

| Before                                             | After                                                    |
| -------------------------------------------------- | -------------------------------------------------------- |
| `createCatalogTranslator(catalog, { locale })`     | `createTranslator(catalog, { locale })`                  |
| `createTranslator(catalogs, { locale, fallback })` | Removed: use `createI18n` for multi-locale               |
| `createTranslationStore({ catalogs, locale })`     | `createI18n({ catalogs, locale, loadCatalog? })`         |
| `hydrateTranslationStore(state)`                   | `createI18n({ state })`                                  |
| `TranslationStore` / `TranslationSnapshot`         | `I18n` / `I18nSnapshot`                                  |
| `segments()` / `segmentsDynamic()`                 | `parts()` / `partsDynamic()`                             |
| `onMissingKey` / `onMissingValue` options          | `missing: 'throw' \| 'key' \| handler`                   |
| `@vielzeug/lingua/format` (`createFormatter`)      | Retained as an optional standalone Intl facade           |
| `TranslationState` version `3`                     | version `4`                                              |
| `LinguaMissingResourceError` (2.x)                 | `LinguaMissingCatalogError` (unchanged from 2.x)         |
| N/A                                                | `LinguaMissingKeyError`, `LinguaMissingValueError` (new) |

## Replace constructor calls

```ts
// Before: fixed catalog
const translator = createCatalogTranslator(catalog, { locale: 'fr' });

// After
const translator = createTranslator(catalog, { locale: 'fr' });
```

```ts
// Before: locale-keyed catalogs
const translator = createTranslator({ en: enCatalog, fr: frCatalog }, { locale: 'fr', fallback: 'en' });

// After: eager catalogs preserve synchronous translation and fallback
const i18n = createI18n({
  catalogs: { en: enCatalog, fr: frCatalog },
  locale: 'fr',
  fallback: 'en',
});
i18n.translate('key');
```

```ts
// Before: mutable store
const i18n = createTranslationStore({ catalogs: { en: enCatalog, fr: async () => frCatalog }, locale: 'en' });

// After
const i18n = createI18n({
  catalogs: { en: enCatalog },
  locale: 'en',
  loadCatalog: (locale) => import(`./locales/${locale}`).then((m) => m.default),
});
```

```ts
// Before: hydration
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

---

# Lingua 26.10 Migration

Lingua 26.10 resets serialized-state versioning and narrows `catalogKeys()` to catalogs only.

## State version is 1

`TranslationState` is versioned `1`: numbering restarts instead of continuing the i18nit counter. `createI18n({ state })` rejects any other version with `LinguaInvalidStateError`. Re-serialize server state with the new build before hydrating.

## Catalog keys from an instance

`catalogKeys()` no longer accepts an `I18n` instance. Pass the current locale catalog explicitly:

```ts
// Before
const allKeys = catalogKeys(i18n);

// After
const state = i18n.serialize();
const allKeys = catalogKeys(state.catalogs[state.locale]);
```

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for the full catalog, translator, and i18n contracts.

---

# Breaking Changes Since 26.11.11

This train collapses the translation surface to one method and removes the snapshot and serialized-state ceremony.

| Before                                     | After                                                            |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `translateDynamic(key, options?)`          | `translate(key as TextKey<C>, options?)`                         |
| `parts()` / `partsDynamic()` / `Part<V>`   | Removed: translate strings; keep rich rendering in the framework |
| `getSnapshot(): I18nSnapshot<C>`           | `getSnapshot(): Locale`                                          |
| `subscribe((snapshot) => ...)`             | `subscribe((locale) => ...)`                                     |
| `createI18n({ state })`                    | `createI18n({ catalogs: state.catalogs, locale: state.locale })` |
| `TranslationState` / its `version` field   | `SerializedI18n`: `{ catalogs, locale }`, no version             |
| `LinguaInvalidStateError`                  | Removed                                                          |
| `count: 0` forcing the `zero` plural form  | `Intl.PluralRules` decides the category                          |
| `TextKey<C>` including keys inside plurals | Removed: plural messages expose no sub-keys                      |

## One translate method

`translateDynamic()` was a runtime-identical alias of `translate()` with a widened key. Pass runtime-assembled keys through a single cast at your wrapper boundary:

```ts
import type { TextKey } from '@vielzeug/lingua';

function t(i18n: I18n<typeof messages.en>, key: string, values?: Values): string {
  return i18n.translate(key as TextKey<typeof messages.en>, values ? { values } : undefined);
}
```

## Rich content moved out

`parts()` returned `{ type: 'text' | 'value' }` arrays for framework nodes. Lingua now only renders strings; map values to pre-translated strings or keep a framework-side template renderer beside the catalog.

## Locale snapshots instead of translator snapshots

`getSnapshot()` returns the current locale and is referentially stable until the locale changes; `subscribe()` listeners receive the new locale. Translate through the instance after each notification. The pair feeds `useSyncExternalStore`, `ripple.fromSubscribable`, and Svelte/Vue stores directly.

## Hydration without `state`

`serialize()` returns `{ catalogs, locale }`. Hydrate with the ordinary options:

```ts
const state = serverI18n.serialize();
const clientI18n = createI18n({ catalogs: state.catalogs, locale: state.locale });
```

Serialized payloads are no longer versioned; `compileCatalog` validates every hydrated catalog shape and throws `LinguaInvalidCatalogError` on malformed data.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for the full catalog, translator, and i18n contracts.
