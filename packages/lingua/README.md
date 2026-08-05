# @vielzeug/lingua

> Explicit, framework-neutral localization for TypeScript.

`@vielzeug/lingua` provides immutable translators for fixed locales and a stateful i18n store for locale changes and optional lazy catalogs.

## Installation

```sh
pnpm add @vielzeug/lingua
```

## Quick Start

```ts
import { createCatalogTranslator } from '@vielzeug/lingua';

const translator = createCatalogTranslator({
  greeting: 'Hello, {name}!',
  inbox: { plural: { one: 'One message', other: '{count} messages' } },
});

translator.translate('greeting', { values: { name: 'Ada' } });
translator.translate('inbox', { count: 3 });
```

## Integration Patterns

Use `translate()` for string interpolation and `segments()` for UI values. Give UI values consumer-owned keys before passing them; Lingua returns same values without cloning or mutation.

```ts
const retry = { key: 'retry', href: '/retry' };
translator.segments('greeting', { values: { name: retry } });
```

Use `createTranslationStore()` only when locale changes at runtime. Its stable `subscribe` and `getSnapshot` methods work directly with platform subscription APIs such as React `useSyncExternalStore`; hydrate client store from server `serialize()` state before first render. Missing keys return key, and absent interpolation values return `{name}` by default.

Keep arrays and application metadata outside catalogs. Store message keys with application definitions, then translate labels while building UI options.

## Exports

- `createCatalogTranslator` — immutable translator for one fixed-locale catalog.
- `createTranslator` — immutable translator for fixed locale-keyed catalogs.
- `createTranslationStore` / `hydrateTranslationStore` — mutable locale state, lazy catalog loading, and SSR state.
- `createFormatter` from `@vielzeug/lingua/format`.
- `validateCatalog` from `@vielzeug/lingua/validate`.

## Documentation

- [Overview](https://vielzeug.dev/lingua/)
- [Usage Guide](https://vielzeug.dev/lingua/usage)
- [API Reference](https://vielzeug.dev/lingua/api)

## License

MIT © Helmuth Saatkamp
