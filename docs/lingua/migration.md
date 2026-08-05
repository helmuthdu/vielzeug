---
title: Lingua 2.0 Migration
---

# Lingua 2.0 Migration

Lingua 2.0 uses explicit locale catalogs and replaces the 1.x I18n API.

## Replace store creation and hydration

```ts
// Before
const i18n = createI18n(options);
const hydrated = hydrateI18n(state);

// After
const store = createTranslationStore(options);
const hydrated = hydrateTranslationStore(state);
```

## Replace resources with catalogs

Move resource definitions and loading code to explicit catalogs. Replace `I18n` state version 2 with `TranslationState` version 3 when persisting or hydrating application state.

## Remove namespace and resource APIs

Namespace and resource APIs, plus `LinguaMissingResourceError`, no longer exist. Use `createCatalogTranslator()` when an integration needs one fixed locale catalog; use `createTranslator()` for fixed locale-keyed catalogs and fallback resolution.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for catalog, store, translator, and state contracts.
