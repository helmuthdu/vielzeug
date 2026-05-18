---
title: I18nit — Deterministic localization runtime for TypeScript
description: Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.
package: i18nit
category: i18n
keywords: [internationalization, translations, pluralization, locale, i18n, l10n, async-loading]
related: [stateit, routeit, fetchit]
exports: [createI18n]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="i18nit" />

<img src="/logo-i18nit.svg" alt="I18nit logo" width="156" class="logo-highlight"/>

# I18nit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/i18nit` &nbsp;·&nbsp; **Category:** I18n

**Key exports:** `createI18n`

**When to use:** Typed i18n with deterministic locale fallback, pluralization, async catalog loading, and reactive subscriptions.

**Related:** [Stateit](/stateit/) · [Routeit](/routeit/) · [Fetchit](/fetchit/)

</details>

`@vielzeug/i18nit` is a small localization runtime for typed translation keys, plural resolution, locale loading, and framework-friendly reactivity.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/i18nit
```

```sh [npm]
npm install @vielzeug/i18nit
```

```sh [yarn]
yarn add @vielzeug/i18nit
```

:::

## Quick Start

```ts
import { createI18n } from '@vielzeug/i18nit';
import { createFormatter } from '@vielzeug/i18nit/format';

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
const fmt = createFormatter(i18n);
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

## Why I18nit?

- Minimal API: `t`, `tp`, `preload`, `setLocale`, `register`, `getSnapshot`, `subscribe`, `has`, `getSupportedLocales`
- Deterministic locale fallback chain resolution
- Typed leaf and plural branch keys with explicit APIs (`t` and `tp`)
- Explicit locale source model (static messages or async loaders)
- Framework-agnostic store primitives for React, Vue, Svelte, Solid, and others
- Zero dependencies

| Feature                           | I18nit                                       | i18next | FormatJS |
| --------------------------------- | -------------------------------------------- | ------- | -------- |
| Bundle size                       | <PackageInfo package="i18nit" type="size" /> | ~24 kB  | ~16 kB   |
| Typed key ergonomics              | ✅                                           | Partial | Partial  |
| Deterministic fallback chain      | ✅                                           | ✅      | ✅       |
| Async locale preload              | ✅                                           | ✅      | ✅       |
| Runtime snapshots + subscriptions | ✅                                           | ❌      | ❌       |
| External formatter bridge         | ✅ (`@vielzeug/i18nit/format`)               | Partial | ✅       |
| Framework agnostic                | ✅                                           | ✅      | ✅       |
| Zero dependencies                 | ✅                                           | ❌      | ❌       |

**Use I18nit when** you want a compact, typed runtime with deterministic fallback behavior and framework-agnostic reactive state.

**Consider i18next or FormatJS when** you need larger ecosystem plugins, message extraction pipelines, or mature framework-specific integrations.

## Features

- One runtime primitive: `createI18n(options)`
- Explicit translation methods: `t(leafKey, vars?)` and `tp(branchKey, count, options?)`
- Explicit locale lifecycle: `register`, `preload`, `setLocale`
- Reactive model through snapshots: `getSnapshot`, `subscribe`
- Deterministic fallback chain using active locale plus configured fallback locales
- Unified missing handling through `onMissing(info)` for both key and interpolation misses
- Formatting kept separate via `createFormatter(source)` from `@vielzeug/i18nit/format`

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

- [Routeit](../routeit/index.md) for locale-aware routes and URL state.
- [Stateit](../stateit/index.md) for reactive locale and translation state.
- [Fetchit](../fetchit/index.md) for lazy loading translation catalogs.

<!-- markdownlint-enable MD025 MD033 MD060 -->
