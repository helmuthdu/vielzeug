---
title: I18nit — Internationalization for TypeScript
description: Type-safe i18n for TypeScript with interpolation, pluralization, async loaders, and Intl formatting helpers.
---

<PackageBadges package="i18nit" />

<img src="/logo-i18nit.svg" alt="I18nit logo" width="156" class="logo-highlight"/>

# I18nit

`@vielzeug/i18nit` is a zero-dependency internationalization library with typed keys, nested message trees, fallback chains, and async locale loading.

<!-- Search keywords: localization runtime, translation catalog, i18n message formatting. -->

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
  messages: {
    de: {
      greeting: 'Hallo, {name}!',
      inbox: { one: 'Eine Nachricht', other: '{count} Nachrichten' },
    },
    en: {
      greeting: 'Hello, {name}!',
      inbox: { zero: 'No messages', one: 'One message', other: '{count} messages' },
      nav: { home: 'Home' },
    },
  },
});

i18n.t('greeting', { name: 'Alice' });
i18n.t('inbox', { count: 0 });
i18n.t('inbox', { count: 3 });

await i18n.switchLocale('de');
i18n.t('nav.home'); // falls back to en
```

## Why I18nit?

Rolling your own i18n means hard-coded string lookups, no pluralisation, no type safety on translation keys, and no lazy loading for large locale bundles.

```ts
// Before — manual locale map (no type safety, no pluralisation)
const messages = {
  en: { greeting: 'Hello, {name}!', items: '{count} items' },
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
const i18n = createI18n<typeof messages.en>({ locale: 'en', messages });
i18n.t('greeting', { name: 'Alice' }); // typed key, typed vars
i18n.t('items', { count: 3 }); // typed + pluralised
```

| Feature              | I18nit                                       | i18next    | typesafe-i18n |
| -------------------- | -------------------------------------------- | ---------- | ------------- |
| Bundle size          | <PackageInfo package="i18nit" type="size" /> | ~15 kB     | ~1 kB         |
| Type-safe keys       | ✅                                           | ❌         | ✅            |
| No code generation   | ✅                                           | ✅         | ❌            |
| Pluralisation        | ✅ Intl.PluralRules                          | ✅         | ✅            |
| Formatting helpers   | ✅ Intl-backed                               | ✅ Plugins | ❌            |
| BCP47 locale cascade | ✅                                           | ✅         | ❌            |
| Async loaders        | ✅                                           | ✅         | ✅            |
| Zero dependencies    | ✅                                           | ❌         | ✅            |

**Use I18nit when** you want type-safe translation keys with full TypeScript inference, pluralisation, and Intl-based formatting — without a code generation step.

**Consider i18next** if you need its large plugin ecosystem (react-i18next, backend adapters) or are migrating an existing project.

## Features

- Type-safe translation keys and namespace scoping
- Dot-notation lookups with fallback chains
- Interpolation for nested vars and array tokens
- Plural messages driven by `Intl.PluralRules`
- Async loading (`ensureLocale`, `switchLocale`, `registerLoader`, `reload`)
- Catalog updates (`add`, `replace`) and notification batching (`batch`)
- Locale-bound and namespace-bound views (`withLocale`, `scope`)
- Intl formatting helpers (`number`, `date`, `list`, `relative`, `currency`)
- Diagnostics (`onDiagnostic`) and custom missing-key handling (`onMissing`)
- Lightweight runtime — <PackageInfo package="i18nit" type="size" /> gzipped, zero dependencies

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Stateit](/stateit/)
- [Craftit](/craftit/)
- [Routeit](/routeit/)
