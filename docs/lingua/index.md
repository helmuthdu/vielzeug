---
title: Lingua — Explicit localization for TypeScript
description: Framework-neutral locale catalogs, typed translations, and explicit plural messages.
package: lingua
category: i18n
keywords: [internationalization, translations, pluralization, locale, i18n, catalog-loading]
related: [ripple, wayfinder, courier]
exports: [createCatalogTranslator, createTranslationStore, createTranslator, hydrateTranslationStore, LinguaError, LinguaDisposedError, LinguaInvalidCatalogError, LinguaInvalidLocaleError, LinguaInvalidPluralCountError, LinguaInvalidStateError, LinguaMissingCatalogError]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="lingua" />

## Why Lingua?

Lingua separates immutable translation from mutable locale state. Use one catalog per locale, then select static or stateful API from whether locale can change.

```ts
// Before
const message = catalogs[locale]?.inbox?.[count === 1 ? 'one' : 'other'] ?? 'inbox';

// After
const output = i18n.translate('inbox', { count });
```

| Feature | Lingua | i18next | FormatJS |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="lingua" type="size" /> | Varies by selected modules | Varies by selected modules |
| Zero runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Explicit plural catalog nodes | <ore-icon name="check" size="16"></ore-icon> | Convention/config dependent | ICU-message dependent |
| Declared lazy locale catalogs | <ore-icon name="check" size="16"></ore-icon> | Plugin/config dependent | Application-defined |
| Immutable locale snapshots | <ore-icon name="check" size="16"></ore-icon> | Application-defined | Application-defined |

<div class="decision-callout">

**Use Lingua when** you need a compact TypeScript runtime with explicit catalog structure, deterministic fallback, and framework-neutral subscriptions.

**Consider i18next or FormatJS when** you need their plugin ecosystems, message extraction pipelines, or framework-specific integrations.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/lingua
```

```sh [npm]
npm install @vielzeug/lingua
```

```sh [yarn]
yarn add @vielzeug/lingua
```

:::

## Quick Start

Create locale store with static catalogs, then dispose it when owner ends.

```ts
import { createTranslationStore } from '@vielzeug/lingua';

const i18n = createTranslationStore({
  catalogs: {
    de: { inbox: { plural: { one: 'Eine Nachricht', other: '{count} Nachrichten' } } },
    en: { inbox: { plural: { one: 'One message', other: '{count} messages' } } },
  },
  locale: 'en',
});

try {
  console.log(i18n.translate('inbox', { count: 3 }));
  await i18n.setLocale('de');
  console.log(i18n.translate('inbox', { count: 1 }));
} finally {
  i18n.dispose();
}
```

## Features

<div class="features-grid">

- `createCatalogTranslator()` compiles one immutable fixed-locale catalog.
- `createTranslator()` compiles immutable locale-keyed catalogs.
- `createTranslationStore()` manages locale changes and declared catalogs.
- `translate()` renders text and plural messages through explicit catalog nodes.
- `translateDynamic()` makes runtime-key lookup explicit.
- `load()` deduplicates lazy catalog loading per locale.
- `getSnapshot()` and `subscribe()` expose immutable translator revisions.
- `serialize()` and `hydrateTranslationStore()` transfer resolved SSR catalogs.
- `createFormatter()` and `validateCatalog()` remain isolated subpath tools.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](../ripple/index.md) adapts Lingua snapshots into reactive application state.
- [Courier](../courier/index.md) can fetch locale catalogs before passing them to Lingua loaders.
- [Wayfinder](../wayfinder/index.md) can drive locale selection from route state.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
