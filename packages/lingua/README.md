# @vielzeug/lingua

> Typed i18n with pluralization and lazy locale loading

## Installation

```sh
pnpm add @vielzeug/lingua
npm install @vielzeug/lingua
yarn add @vielzeug/lingua
```

## Quick Start

```ts
import { createTranslator } from '@vielzeug/lingua';

const translator = createTranslator({
  greeting: 'Hello, {name}!',
  inbox: { plural: { one: 'One message', other: '{count} messages' } },
}, { locale: 'en' });

translator.translate('greeting', { values: { name: 'Ada' } });
translator.translate('inbox', { count: 3 });
```

## Documentation

- [Overview](https://vielzeug.dev/lingua/)
- [Usage Guide](https://vielzeug.dev/lingua/usage)
- [API Reference](https://vielzeug.dev/lingua/api)
- [Examples](https://vielzeug.dev/lingua/examples)
- [Migration Guide](https://vielzeug.dev/lingua/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
