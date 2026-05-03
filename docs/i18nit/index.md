---
title: I18nit — Internationalization for TypeScript
description: Minimal i18n for TypeScript with explicit plural translation, best-effort locale loading, and unified Intl formatting.
---

<PackageBadges package="i18nit" />

<img src="/logo-i18nit.svg" alt="I18nit logo" width="156" class="logo-highlight"/>

# I18nit

`@vielzeug/i18nit` is a zero-dependency internationalization runtime with nested message lookup, explicit plural translation, locale fallback chains, and unified Intl formatting.

<!-- Search keywords: localization runtime, translation catalog, i18n message formatting, locale loading, plural translation. -->

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

const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  loaders: {
    de: () => import('./locales/de.json').then((m) => m.default),
  },
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: { zero: 'No messages', one: 'One message', other: '{count} messages' },
      nav: { home: 'Home' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 0);
i18n.tp('inbox', 3);

await i18n.preload('de');
await i18n.setLocale('de');
i18n.t('nav.home'); // falls back to en

i18n.format({ kind: 'currency', currency: 'EUR', value: 19.99 });
```

## Why I18nit?

Rolling your own i18n means hard-coded string lookups, no pluralisation strategy, no fallback chain, and ad hoc formatting scattered around the app.

```ts
// Before — manual locale map (no fallback chain, no explicit plural strategy)
const messages = {
  en: {
    greeting: 'Hello, {name}!',
    items: { zero: 'No items', one: 'One item', other: '{count} items' },
  },
  de: { greeting: 'Hallo, {name}!' },
};
let locale = 'en';
function t(key: string, vars?: Record<string, unknown>) {
  let msg = (messages as any)[locale]?.[key] ?? key; // no type safety
  if (vars) msg = msg.replace(/{(\w+)}/g, (_: string, k: string) => String(vars[k] ?? k));
  return msg;
}

// After — I18nit
import { createI18n } from '@vielzeug/i18nit';
const i18n = createI18n({ fallback: 'en', locale: 'en', messages });
i18n.t('greeting', { name: 'Alice' });
i18n.tp('items', 3);
i18n.format({ kind: 'number', value: 1234.56 });
```

| Feature              | I18nit                                       | i18next    | typesafe-i18n |
| -------------------- | -------------------------------------------- | ---------- | ------------- |
| Bundle size          | <PackageInfo package="i18nit" type="size" /> | ~15 kB     | ~1 kB         |
| Type-safe keys       | ⏳ Planned                                   | ❌         | ✅            |
| No code generation   | ✅                                           | ✅         | ❌            |
| Pluralisation        | ✅ Intl.PluralRules                          | ✅         | ✅            |
| Formatting helpers   | ✅ Intl-backed                               | ✅ Plugins | ❌            |
| BCP47 locale cascade | ✅                                           | ✅         | ❌            |
| Async loaders        | ✅                                           | ✅         | ✅            |
| Zero dependencies    | ✅                                           | ❌         | ✅            |

**Use I18nit when** you want a small i18n runtime with explicit translation rules, request-safe instances, runtime locale loading, and Intl-based formatting.

**Consider i18next** if you need its large plugin ecosystem (react-i18next, backend adapters) or are migrating an existing project.

## Features

- Minimal translation API: `t`, `tp`, `format`
- Dot-notation lookups with locale fallback chains
- Interpolation for plain and nested vars
- Explicit plural messages driven by `Intl.PluralRules`
- Best-effort preload plus strict locale switching
- Catalog replacement and runtime loader registration
- Subscription API for locale changes and active-chain catalog refreshes
- Diagnostics (`onDiagnostic`) and custom missing-key handling (`onMissing`)
- Lightweight runtime — <PackageInfo package="i18nit" type="size" /> gzipped, zero dependencies

## Core API

```ts
const i18n = createI18n({
  fallback: 'en',
  locale: 'en',
  messages: {
    en: {
      inbox: {
        one: 'One message',
        other: '{count} messages',
        zero: 'No messages',
      },
      welcome: 'Hello, {name}',
    },
  },
});

i18n.t('welcome', { name: 'Alice' });
i18n.tp('inbox', 3);
i18n.format({ kind: 'currency', currency: 'EUR', value: 19.99 });
```

## Message Shape

Catalogs are recursive objects with string leaves:

```ts
const messages = {
  en: {
    auth: {
      login: 'Log in',
    },
    inbox: {
      zero: 'No messages',
      one: 'One message',
      other: '{count} messages',
    },
  },
};
```

Use `t()` for direct keys like `auth.login` and `tp()` for plural namespaces like `inbox`.

## Typical Usage

- Create one shared instance for single-locale browser apps.
- Create one instance per request for SSR or multi-tenant server code.
- Use `setCatalog()` when catalogs come from the server or CMS at runtime.
- Use `setLoader()` plus `preload()` or `setLocale()` for lazy locale bundles.

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Stateit](/stateit/)
- [Craftit](/craftit/)
- [Routeit](/routeit/)
