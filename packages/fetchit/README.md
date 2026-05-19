---
description: Type-safe HTTP, query cache, mutations, SSE, and streaming built on native fetch.
package: fetchit
category: http
keywords: [http-client, fetch, caching, deduplication, mutations, query-cache, rest, sse, streaming, interceptors]
related: [validit, stateit, deposit]
exports: [createApi, createFetchit, createMutation, createQuery, createStream, createTransportCore, HttpError]
---

# @vielzeug/fetchit

> Type-safe HTTP, query cache, mutations, SSE, and streaming built on native fetch.

[![npm version](https://img.shields.io/npm/v/@vielzeug/fetchit)](https://www.npmjs.com/package/@vielzeug/fetchit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/fetchit` &nbsp;·&nbsp; **Category:** Http

**Key exports:** `createApi`, `createFetchit`, `createQuery`, `createMutation`, `createStream`, `createTransportCore`, `HttpError`

**When to use:** Typed HTTP, caching, mutations, SSE, and readable streaming with a shared interceptor pipeline.

**Related:** [@vielzeug/validit](https://vielzeug.dev/validit/) · [@vielzeug/stateit](https://vielzeug.dev/stateit/) · [@vielzeug/deposit](https://vielzeug.dev/deposit/)

</details>

`@vielzeug/fetchit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/fetchit
npm install @vielzeug/fetchit
yarn add @vielzeug/fetchit
```

## Quick Start

```ts
import { createFetchit } from '@vielzeug/fetchit';

type NewUser = { name: string };
type User = { id: number; name: string };

const client = createFetchit({
  baseUrl: 'https://api.example.com',
  query: { staleTime: 5_000 },
});

const user = await client.query.fetch({
  key: ['users', 1],
  fn: ({ signal }) => client.api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});

const createUser = client.mutation((input: NewUser, signal) =>
  client.api.post<User>('/users', { body: input, signal }),
);

const nextUser = await createUser.mutate({ name: 'Alice' });
client.query.set(['users', nextUser.id], nextUser);
client.query.invalidate(['users']);
```

## Documentation

Full docs: https://vielzeug.dev/fetchit/

- [Overview](https://vielzeug.dev/fetchit/)
- [Usage Guide](https://vielzeug.dev/fetchit/usage)
- [API Reference](https://vielzeug.dev/fetchit/api)
- [Examples](https://vielzeug.dev/fetchit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
