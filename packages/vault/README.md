# @vielzeug/vault

> Adapter-free typed storage core with focused browser and SQLite subpaths

## Installation

```sh
pnpm add @vielzeug/vault
npm install @vielzeug/vault
yarn add @vielzeug/vault
```

## Quick Start

```ts
import { s } from '@vielzeug/spell';
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

type User = { id: number; name: string };
const UserSchema = s.object({ id: s.number(), name: s.string() });
const store = createLocalStorage({
  codecs: { users: UserSchema },
  name: 'app',
  schema: { users: table<User>('id') },
});

await store.put('users', { id: 1, name: 'Ada' });
const stop = store.observe('users', (users) => console.log(users));
stop();
```

## Documentation

- [Overview](https://vielzeug.dev/vault/)
- [Usage Guide](https://vielzeug.dev/vault/usage)
- [API Reference](https://vielzeug.dev/vault/api)
- [Examples](https://vielzeug.dev/vault/examples)
- [Migration Guide](https://vielzeug.dev/vault/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
