# @vielzeug/lingua

> Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.

[![npm version](https://img.shields.io/npm/v/@vielzeug/lingua)](https://www.npmjs.com/package/@vielzeug/lingua) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/lingua` &nbsp;·&nbsp; **Category:** i18n

**Key exports:** `createI18n` · `createFormatter` (from `@vielzeug/lingua/format`) · `validateCatalog` (from `@vielzeug/lingua/validate`)

**When to use:** Minimal i18n runtime with typed keys, deterministic locale fallback, and framework-agnostic reactive subscriptions.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/wayfinder](https://vielzeug.dev/wayfinder/) · [@vielzeug/courier](https://vielzeug.dev/courier/)

</details>

`@vielzeug/lingua` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/lingua
npm install @vielzeug/lingua
yarn add @vielzeug/lingua
```

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
    de: () => import('./locales/de.json').then((m) => m.default),
  },
});

await i18n.setLocale('de');

i18n.t('greeting', { name: 'Alice' });
i18n.tp('inbox', 3);

// Scope reduces key repetition inside a namespace
const nav = i18n.scope('nav');
nav.t('home'); // resolves 'nav.home'

// Bind a cached per-key function for hot-path rendering
const greet = i18n.bind('greeting');
const users = [{ name: 'Alice' }, { name: 'Bob' }];
users.forEach((u) => greet({ name: u.name }));

// Merge route-specific keys on top of the base catalog
await i18n.merge('en', () => import('./routes/settings.i18n.json').then((m) => m.default));

// Fork the shared instance for SSR per-request isolation
const reqI18n = i18n.fork({ locale: req.locale });

// Formatter bound to the current locale — follows locale changes automatically
const fmt = createFormatter(() => i18n.locale);
fmt.currency(19.99, 'EUR');
```

## Documentation

- [Overview](https://vielzeug.dev/lingua/)
- [Usage Guide](https://vielzeug.dev/lingua/usage)
- [API Reference](https://vielzeug.dev/lingua/api)
- [Examples](https://vielzeug.dev/lingua/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
