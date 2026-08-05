# @vielzeug/courier

> Type-safe HTTP, query cache, mutations, SSE, and streaming built on native fetch.

[![npm version](https://img.shields.io/npm/v/@vielzeug/courier)](https://www.npmjs.com/package/@vielzeug/courier) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/courier` &nbsp;·&nbsp; **Category:** Http

**Key exports:** `createCourier`, `CourierError`, `CourierHttpError`, `CourierNetworkError`, `CourierTimeoutError`, `CourierAbortError`

**When to use:** Typed HTTP, caching, mutations, SSE, and readable streaming with a shared interceptor pipeline.

**Related:** [@vielzeug/spell](https://vielzeug.dev/spell/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/vault](https://vielzeug.dev/vault/)

</details>

`@vielzeug/courier` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/courier
npm install @vielzeug/courier
yarn add @vielzeug/courier
```

## Quick Start

```ts
import { createCourier } from '@vielzeug/courier';

type NewUser = { name: string };
type User = { id: number; name: string };

const client = createCourier({
  baseUrl: 'https://api.example.com',
  query: { staleTime: 5_000 },
});

const userKey = ['users', 1] as const;
await client.queries.fetch({
  fetch: ({ signal }) => client.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  key: userKey,
  staleTime: 5_000,
});

const nextUser = await client.mutate({
  request: ({ signal }) => client.post<User>('/users', { body: { name: 'Alice' }, signal }),
});
client.queries.set(['users', nextUser.id], nextUser);
client.queries.invalidate(['users']);
```

## Documentation

Full docs: https://vielzeug.dev/courier/

- [Overview](https://vielzeug.dev/courier/)
- [Usage Guide](https://vielzeug.dev/courier/usage)
- [API Reference](https://vielzeug.dev/courier/api)
- [Examples](https://vielzeug.dev/courier/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
