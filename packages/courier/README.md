# @vielzeug/courier

> Typed HTTP client with bounded structured-key caching, prefetching, immutable middleware, and structured errors

## Installation

```sh
pnpm add @vielzeug/courier
npm install @vielzeug/courier
yarn add @vielzeug/courier
```

## Quick Start

```ts
import { createCourier, withBearerAuth } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({
  baseUrl: 'https://api.example.com',
  middleware: [withBearerAuth('token')],
});
const usersKey = ['accounts', 'account-1', 'users'] as const;

await courier.prefetch<User[]>('/users', { cache: { key: usersKey } });
const users = await courier.get<User[]>('/users', { cache: { key: usersKey } });
const created = await courier.post<User>('/users', { body: { name: 'Ada' } });
courier.invalidateCache(['accounts', 'account-1', 'users']);

courier.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/courier/)
- [Usage Guide](https://vielzeug.dev/courier/usage)
- [API Reference](https://vielzeug.dev/courier/api)
- [Examples](https://vielzeug.dev/courier/examples)
- [Migration Guide](https://vielzeug.dev/courier/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
