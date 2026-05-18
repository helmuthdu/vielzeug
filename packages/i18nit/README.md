---
description: Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.
package: i18nit
category: i18n
keywords: [internationalization, translations, pluralization, locale, i18n, l10n, async-loading]
related: [stateit, routeit, fetchit]
exports: [createI18n]
---

# @vielzeug/i18nit

> Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.

[![npm version](https://img.shields.io/npm/v/@vielzeug/i18nit)](https://www.npmjs.com/package/@vielzeug/i18nit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/i18nit` &nbsp;·&nbsp; **Category:** I18n

**Key exports:** `createI18n`

**When to use:** Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.

**Related:** [@vielzeug/stateit](https://vielzeug.dev/stateit/) · [@vielzeug/routeit](https://vielzeug.dev/routeit/) · [@vielzeug/fetchit](https://vielzeug.dev/fetchit/)

</details>

`@vielzeug/i18nit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/i18nit
npm install @vielzeug/i18nit
yarn add @vielzeug/i18nit
```

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
    de: () => import('./locales/de.json').then((m) => m.default),
  },
});

await i18n.preload('de');
await i18n.setLocale('de');

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);

const fmt = createFormatter(i18n);
fmt.currency(19.99, 'EUR');
```

## Documentation

- [Overview](https://vielzeug.dev/i18nit/)
- [Usage Guide](https://vielzeug.dev/i18nit/usage)
- [API Reference](https://vielzeug.dev/i18nit/api)
- [Examples](https://vielzeug.dev/i18nit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
