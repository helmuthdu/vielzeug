# @vielzeug/lingua

> Explicit, framework-neutral localization for TypeScript.

`@vielzeug/lingua` provides an immutable translator for fixed locales and a stateful i18n store for locale changes and optional lazy catalogs.

## Installation

```sh
pnpm add @vielzeug/lingua
```

## Quick Start

```ts
import { createTranslationStore } from '@vielzeug/lingua';

const translations = createTranslationStore({
  catalogs: {
    en: {
      greeting: 'Hello, {name}!',
      inbox: { plural: { one: 'One message', other: '{count} messages' } },
    },
  },
  locale: 'en',
});

translations.translate('greeting', { values: { name: 'Ada' } });
translations.translate('inbox', { count: 3 });
```

## Exports

- `createTranslator` — immutable translation engine for fixed-locale catalogs.
- `createTranslationStore` / `hydrateTranslationStore` — mutable locale state, lazy catalog loading, and SSR state.
- `createFormatter` from `@vielzeug/lingua/format`.
- `validateCatalog` from `@vielzeug/lingua/validate`.

## Documentation

- [Overview](https://vielzeug.dev/lingua/)
- [Usage Guide](https://vielzeug.dev/lingua/usage)
- [API Reference](https://vielzeug.dev/lingua/api)

## License

MIT © Helmuth Saatkamp
