# @vielzeug/courier

> Type-safe HTTP, query cache, mutations, SSE, and streaming built on native fetch.

[![npm version](https://img.shields.io/npm/v/@vielzeug/courier)](https://www.npmjs.com/package/@vielzeug/courier) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/courier` &nbsp;·&nbsp; **Category:** Http

**Key exports:** `createApi`, `createCourier`, `createQuery`, `createMutation`, `createStream`, `CourierError`, `HttpError`, `NetworkError`, `TimeoutError`, `AbortError`

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

// observe() returns a SyncStore and triggers a background fetch if stale
const store = client.query.observe({
  key: ['users', 1],
  fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
  staleTime: 5_000,
});

const createUser = client.mutation((input: NewUser, signal) =>
  client.api.post<User>('/users', { body: input, signal }),
);

const nextUser = await createUser.mutate({ name: 'Alice' });
client.query.set(['users', nextUser.id], nextUser);
client.query.invalidate(['users']);
```

## Documentation

Full docs: https://vielzeug.dev/courier/

- [Overview](https://vielzeug.dev/courier/)
- [Usage Guide](https://vielzeug.dev/courier/usage)
- [API Reference](https://vielzeug.dev/courier/api)
- [Examples](https://vielzeug.dev/courier/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
