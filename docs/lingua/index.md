---
title: Lingua — Deterministic localization runtime for TypeScript
description: Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.
package: lingua
category: i18n
keywords: [internationalization, translations, pluralization, locale, i18n, l10n, async-loading]
related: [ripple, wayfinder, courier]
exports: [createI18n, serializeI18n, hydrateI18n, createFormatter, LinguaError, E, validateCatalog]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="lingua" />

## Why Lingua?

Most i18n libraries either couple runtime and framework, or require a global plugin system. Lingua is a plain object with a subscription model that any framework can consume directly.

```ts
// Before — manual key lookup with no type safety or fallback
const messages = { en: { greeting: 'Hello, {name}!' }, de: { greeting: 'Hallo, {name}!' } };
const locale = 'de';
const raw = (messages[locale] ?? messages['en'])['greeting'].replace('{name}', 'Alice');

// After — typed keys, fallback chain, plural resolution, reactive subscriptions
const i18n = createI18n({ locale: 'de', fallback: 'en', catalogs: messages });
const greeting = i18n.t('greeting', { name: 'Alice' });
```

- Minimal API: `t`, `tp`, `extend`, `preload`, `setLocale`, `register`, `scope`, `fork`, `getSnapshot`, `subscribe`, `has`, `isLoaded`, `isRegistered`, `dispose`, `getSupportedLocales`
- Deterministic locale fallback chain resolution
- Typed leaf and plural branch keys with explicit APIs (`t` and `tp`)
- Explicit locale source model (static messages or async loaders)
- Typed error class `LinguaError` with stable `E.*` code constants
- Framework-agnostic store primitives that compose with any UI framework
- Zero dependencies

| Feature                           | Lingua                                                                 | i18next                                    | FormatJS                                   |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Bundle size                       | <PackageInfo package="lingua" type="size" />                           | ~24 kB                                     | ~16 kB                                     |
| Typed key ergonomics              | <sg-icon name="check" size="16"></sg-icon>                             | Partial                                    | Partial                                    |
| Deterministic fallback chain      | <sg-icon name="check" size="16"></sg-icon>                             | <sg-icon name="check" size="16"></sg-icon> | <sg-icon name="check" size="16"></sg-icon> |
| Async locale preload              | <sg-icon name="check" size="16"></sg-icon>                             | <sg-icon name="check" size="16"></sg-icon> | <sg-icon name="check" size="16"></sg-icon> |
| Namespace lazy loading            | <sg-icon name="check" size="16"></sg-icon> (`extend()`)                | Partial                                    | <sg-icon name="x" size="16"></sg-icon>     |
| Runtime snapshots + subscriptions | <sg-icon name="check" size="16"></sg-icon>                             | <sg-icon name="x" size="16"></sg-icon>     | <sg-icon name="x" size="16"></sg-icon>     |
| External formatter bridge         | <sg-icon name="check" size="16"></sg-icon> (`@vielzeug/lingua/format`) | Partial                                    | <sg-icon name="check" size="16"></sg-icon> |
| Framework agnostic                | <sg-icon name="check" size="16"></sg-icon>                             | <sg-icon name="check" size="16"></sg-icon> | <sg-icon name="check" size="16"></sg-icon> |
| Zero dependencies                 | <sg-icon name="check" size="16"></sg-icon>                             | <sg-icon name="x" size="16"></sg-icon>     | <sg-icon name="x" size="16"></sg-icon>     |

<div class="decision-callout">

**Use Lingua when** you want a compact, typed runtime with deterministic fallback behavior and framework-agnostic reactive state.

**Consider i18next or FormatJS when** you need larger ecosystem plugins, message extraction pipelines, or mature framework-specific integrations.

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

```ts
import { createI18n } from '@vielzeug/lingua';
import { createFormatter } from '@vielzeug/lingua/format';

const i18n = createI18n({
  locale: 'en',
  fallback: 'en',
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: {
        zero: 'No messages',
        one: 'One message',
        other: '{count} messages',
      },
    },
    fr: () => import('./locales/fr.json').then((m) => m.default),
  },
});

await i18n.preload('fr');
await i18n.setLocale('fr');

const greeting = i18n.t('greeting', { name: 'Alice' });
const messages = i18n.tp('inbox', 3);

// Scope reduces key repetition inside a namespace
const nav = i18n.scope('nav');
nav.t('home'); // resolves 'nav.home'

// Namespace-based lazy loading for route-specific keys
await i18n.extend('settings', (locale) => import(`./routes/${locale}/settings.i18n.json`).then((m) => m.default));

// Formatter bound to the current locale — follows locale changes automatically
const fmt = createFormatter(() => i18n.locale);
const price = fmt.currency(12.5, 'EUR');

const unsubscribe = i18n.subscribe(
  (next) => {
    console.log(next.locale);
  },
  { immediate: true },
);

unsubscribe();

i18n.getSupportedLocales();
```

## Features

<div class="features-grid">

- One runtime primitive: `createI18n(options)`
- Explicit translation methods: `t(leafKey, vars?)` and `tp(branchKey, count, options?)`
- Explicit locale lifecycle: `register`, `preload`, `setLocale`
- Namespace lazy loading: `extend(ns, factory, locale?)` registers and immediately loads a partial catalog — deduplicates per `ns + locale`; use for per-route or per-feature keys
- Scoped translation helpers: `scope(prefix)` returns a `{ fmt, t, tp, has }` helper bound to a key prefix
- Unified key existence check: `has(key)` returns `true` for leaf keys, branch keys, and pipe-plural base keys in the active fallback chain
- Loaded-locale predicate: `isLoaded(locale)` returns `true` when a catalog is fully resolved — safe for `serializeI18n()` guards
- Registered-locale predicate: `isRegistered(locale)` distinguishes "never configured" from "async loader not yet called"
- Instance disposal: `dispose()` clears all subscribers and catalog state — prevents memory leaks in route-scoped SPA instances
- Typed error handling: `LinguaError` class with `E.*` code constants for safe error branching
- Instance forking: `fork(overrides?)` creates an isolated child for SSR or test isolation
- Reactive model through snapshots: `getSnapshot`, `subscribe`
- Deterministic fallback chain using active locale plus configured fallback locales
- Separate missing handlers: `onMissingKey(key, locale)` and `onMissingVar(varName, key, locale)`
- Formatting kept separate via `createFormatter(source)` from `@vielzeug/lingua/format`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Wayfinder](../wayfinder/index.md) for locale-aware routes and URL state.
- [Ripple](../ripple/index.md) for reactive locale and translation state.
- [Courier](../courier/index.md) for lazy loading translation catalogs.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
