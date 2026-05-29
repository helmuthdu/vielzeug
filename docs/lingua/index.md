---
title: Lingua — Deterministic localization runtime for TypeScript
description: Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.
package: lingua
category: i18n
keywords: [internationalization, translations, pluralization, locale, i18n, l10n, async-loading]
related: [ripple, route, courier]
exports: [createI18n, createFormatter]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="lingua" />

<img src="/logo-lingua.svg" alt="Lingua logo" width="156" class="logo-highlight"/>

# Lingua

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/lingua` &nbsp;·&nbsp; **Category:** I18n

**Key exports:** `createI18n` · `createFormatter` (from `@vielzeug/lingua/format`)

**When to use:** Typed i18n with deterministic locale fallback, pluralization, async catalog loading, partial catalog merging, and reactive subscriptions.

**Related:** [Ripple](/ripple/) · [Route](/route/) · [Courier](/courier/)

</details>

`@vielzeug/lingua` is a small localization runtime for typed translation keys, plural resolution, locale loading, and framework-friendly reactivity.


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

// Merge route-specific keys on top of the base catalog
await i18n.merge('en', () => import('./routes/settings.i18n.json').then((m) => m.default));

// Formatter bound to the current locale — follows locale changes automatically
const fmt = createFormatter(() => i18n.locale);
const price = fmt.currency(12.5, 'EUR');

const snapshot = i18n.getSnapshot();
const unsubscribe = i18n.subscribe(
  (next) => {
    console.log(next.locale, next.version);
  },
  { immediate: true },
);

unsubscribe();

i18n.getSupportedLocales();
```

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

- Minimal API: `t`, `tp`, `preload`, `setLocale`, `register`, `merge`, `scope`, `getSnapshot`, `subscribe`, `has`, `getSupportedLocales`
- Deterministic locale fallback chain resolution
- Typed leaf and plural branch keys with explicit APIs (`t` and `tp`)
- Explicit locale source model (static messages or async loaders)
- Partial catalog merging via `merge()` — add route-level keys without full catalog replacement
- Framework-agnostic store primitives that compose with any UI framework
- Zero dependencies

| Feature                           | Lingua                                       | i18next | FormatJS |
| --------------------------------- | -------------------------------------------- | ------- | -------- |
| Bundle size                       | <PackageInfo package="lingua" type="size" /> | ~24 kB  | ~16 kB   |
| Typed key ergonomics              | ✅                                           | Partial | Partial  |
| Deterministic fallback chain      | ✅                                           | ✅      | ✅       |
| Async locale preload              | ✅                                           | ✅      | ✅       |
| Partial catalog merging           | ✅ (`merge()`)                               | Partial | ❌       |
| Runtime snapshots + subscriptions | ✅                                           | ❌      | ❌       |
| External formatter bridge         | ✅ (`@vielzeug/lingua/format`)               | Partial | ✅       |
| Framework agnostic                | ✅                                           | ✅      | ✅       |
| Zero dependencies                 | ✅                                           | ❌      | ❌       |

**Use Lingua when** you want a compact, typed runtime with deterministic fallback behavior and framework-agnostic reactive state.

**Consider i18next or FormatJS when** you need larger ecosystem plugins, message extraction pipelines, or mature framework-specific integrations.

## Features

- One runtime primitive: `createI18n(options)`
- Explicit translation methods: `t(leafKey, vars?)` and `tp(branchKey, count, options?)`
- Explicit locale lifecycle: `register`, `preload`, `setLocale`
- Partial catalog merging: `merge(locale, source)` adds keys without replacing the full catalog
- Scoped translation helpers: `scope(prefix)` returns a helper bound to a key prefix
- Reactive model through snapshots: `getSnapshot`, `subscribe`
- Deterministic fallback chain using active locale plus configured fallback locales
- Unified missing handling through `onMissing(info)` for both key and interpolation misses
- Formatting kept separate via `createFormatter(source)` from `@vielzeug/lingua/format`

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Route](../route/index.md) for locale-aware routes and URL state.
- [Ripple](../ripple/index.md) for reactive locale and translation state.
- [Courier](../courier/index.md) for lazy loading translation catalogs.

<!-- markdownlint-enable MD025 MD033 MD060 -->
