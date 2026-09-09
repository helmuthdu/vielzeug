# @vielzeug/scout

> Trigram fuzzy-search index with highlighting and reactive layer

## Installation

```sh
pnpm add @vielzeug/scout
npm install @vielzeug/scout
yarn add @vielzeug/scout
```

## Quick Start

```ts
import { createIndex } from '@vielzeug/scout';

const users = [
  { email: 'ada@example.com', name: 'Ada Lovelace' },
  { email: 'grace@example.com', name: 'Grace Hopper' },
];

const index = createIndex(users, {
  fields: [
    { field: 'name', weight: 2 },
    { field: 'email' },
  ],
});

console.log(index.search('ada')[0]?.item.name); // Ada Lovelace
```

## Documentation

- [Overview](https://vielzeug.dev/scout/)
- [Usage Guide](https://vielzeug.dev/scout/usage)
- [API Reference](https://vielzeug.dev/scout/api)
- [Examples](https://vielzeug.dev/scout/examples)
- [Migration Guide](https://vielzeug.dev/scout/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
