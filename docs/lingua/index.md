---
title: Lingua — Explicit localization for TypeScript
description: Framework-neutral locale resources, typed translations, and explicit plural messages.
package: lingua
category: i18n
keywords: [internationalization, translations, pluralization, locale, i18n, resource-loading]
related: [ripple, wayfinder, courier]
exports: [createI18n, createTranslator, hydrateI18n, LinguaError, LinguaDisposedError, LinguaInvalidCatalogError, LinguaInvalidLocaleError, LinguaInvalidPluralCountError, LinguaInvalidStateError, LinguaMissingResourceError]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="lingua" />

## Why Lingua?

Lingua keeps translation lookup independent from framework state. You declare text and plural messages explicitly, then choose either an immutable translator or a locale store with declared resources. This avoids object-shape plural inference and hidden loading registries.

```ts
// Before
const message = catalogs[locale]?.inbox?.[count === 1 ? 'one' : 'other'] ?? 'inbox';
const output = message.replace('{count}', String(count));

// After
const output = translator.translate('inbox', { count });
```

| Feature | Lingua | i18next | FormatJS |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="lingua" type="size" /> | Varies by selected modules | Varies by selected modules |
| Zero runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Explicit plural catalog nodes | <ore-icon name="check" size="16"></ore-icon> | Convention/config dependent | ICU-message dependent |
| Declarative feature resources | <ore-icon name="check" size="16"></ore-icon> | Plugin/config dependent | Application-defined |
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

Create a locale store with static core catalogs, then dispose it when its owner ends.

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  resources: {
    core: {
      de: { inbox: { plural: { one: 'Eine Nachricht', other: '{count} Nachrichten' } } },
      en: { inbox: { plural: { one: 'One message', other: '{count} messages' } } },
    },
  },
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

- `createTranslator()` compiles immutable multi-locale catalogs.
- `createI18n()` manages locale changes and declared resources.
- `translate()` renders text messages and plural messages through explicit catalog nodes.
- `segments()` preserves framework nodes and other typed interpolation values.
- `load()` deduplicates feature-resource loading per locale.
- `getSnapshot()` and `subscribe()` expose immutable translator revisions.
- `serialize()` and `hydrateI18n()` transfer resolved SSR resources.
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
- [Courier](../courier/index.md) can fetch locale resources before passing them to Lingua loaders.
- [Wayfinder](../wayfinder/index.md) can drive locale selection from route state.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
