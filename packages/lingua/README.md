# @vielzeug/lingua

> Explicit, framework-neutral localization for TypeScript.

`@vielzeug/lingua` separates immutable translation from mutable locale resources. Text and plural messages have distinct catalog shapes; resource loading has one lifecycle.

## Installation

```sh
pnpm add @vielzeug/lingua
```

## Quick Start

```ts
import { createI18n } from '@vielzeug/lingua';

const i18n = createI18n({
  locale: 'en',
  resources: {
    core: {
      en: {
        greeting: 'Hello, {name}!',
        inbox: { plural: { one: 'One message', other: '{count} messages' } },
      },
    },
  },
});

i18n.translate('greeting', { values: { name: 'Ada' } });
i18n.translate('inbox', { count: 3 });
```

## Exports

- `createTranslator` — immutable translation engine.
- `createI18n` / `hydrateI18n` — reactive locale resources and SSR state.
- `createFormatter` from `@vielzeug/lingua/format`.
- `validateCatalog` from `@vielzeug/lingua/validate`.

## Documentation

- [Overview](https://vielzeug.dev/lingua/)
- [Usage Guide](https://vielzeug.dev/lingua/usage)
- [API Reference](https://vielzeug.dev/lingua/api)

## License

MIT © Helmuth Saatkamp
