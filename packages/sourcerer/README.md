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

try {
  await users.apply({ page: 1 });
  console.log(users.state.items);
  console.log(users.state.pagination.totalItems);
} catch (error) {
  console.error(error);
} finally {
  users.dispose();
}
```

## Features

- `PageSource.apply()`: reconcile page and structurally compared parameters in at most one request.
- `createResource()`: load one observable value immediately, or pass `start: false` and await `reload()`; failures retain previous data.

## Documentation

- [Overview](https://vielzeug.dev/sourcerer/)
- [Usage Guide](https://vielzeug.dev/sourcerer/usage)
- [API Reference](https://vielzeug.dev/sourcerer/api)
- [Examples](https://vielzeug.dev/sourcerer/examples)
- [Migration Guide](https://vielzeug.dev/sourcerer/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
