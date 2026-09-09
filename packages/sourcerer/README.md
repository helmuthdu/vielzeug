# @vielzeug/sourcerer

> Reactive collection sources with local, page, cursor, and infinite pagination

## Installation

```sh
pnpm add @vielzeug/sourcerer
npm install @vielzeug/sourcerer
yarn add @vielzeug/sourcerer
```

## Quick Start

```ts
import { createPageSource } from '@vielzeug/sourcerer';

const users = createPageSource({
  load: async ({ page, pageSize }) => ({
    items: [{ id: page, name: 'Ada' }].slice(0, pageSize),
    totalItems: 1,
  }),
  pageSize: 20,
});

await users.reload();
console.log(users.state.items);
console.log(users.state.pagination.totalItems);
users.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/sourcerer/)
- [Usage Guide](https://vielzeug.dev/sourcerer/usage)
- [API Reference](https://vielzeug.dev/sourcerer/api)
- [Examples](https://vielzeug.dev/sourcerer/examples)
- [Migration Guide](https://vielzeug.dev/sourcerer/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
