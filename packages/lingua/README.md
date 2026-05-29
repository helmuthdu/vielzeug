---
description: Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.
package: lingua
category: i18n
keywords: [internationalization, translations, pluralization, locale, i18n, l10n, async-loading]
related: [ripple, route, courier]
exports: [createI18n]
---

# /lingua

> Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.

[![npm version](https://img.shields.io/npm/v//lingua)](https://www.npmjs.com/package//lingua) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/lingua` &nbsp;·&nbsp; **Category:** I18n

**Key exports:** `createI18n`

**When to use:** Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/route](https://vielzeug.dev/route/) · [@vielzeug/courier](https://vielzeug.dev/courier/)

</details>

`/lingua` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /lingua
npm install /lingua
yarn add /lingua
```

## Quick Start

```ts
import { createI18n } from '/lingua';
import { createFormatter } from '/lingua/format';

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

- [Overview](https://vielzeug.dev/lingua/)
- [Usage Guide](https://vielzeug.dev/lingua/usage)
- [API Reference](https://vielzeug.dev/lingua/api)
- [Examples](https://vielzeug.dev/lingua/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
