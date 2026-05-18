---
description: Type-safe HTTP client, cache, and lean mutation helper built on native fetch.
package: fetchit
category: http
keywords: [http-client, fetch, caching, deduplication, mutations, query-cache, rest, interceptors]
related: [validit, stateit, deposit]
exports: [createApi, createQuery, createMutation, HttpError]
---

# @vielzeug/fetchit

> Type-safe HTTP client, cache, and lean mutation helper built on native fetch.

[![npm version](https://img.shields.io/npm/v/@vielzeug/fetchit)](https://www.npmjs.com/package/@vielzeug/fetchit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/fetchit` &nbsp;·&nbsp; **Category:** Http

**Key exports:** `createApi`, `createQuery`, `createMutation`, `HttpError`

**When to use:** Type-safe HTTP client, cache, and lean mutation helper built on native fetch.

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
import { createApi, createMutation, createQuery } from '@vielzeug/fetchit';

type User = { id: number; name: string };
type NewUser = { name: string };

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ attempts: 3, staleTime: 5_000 });

const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});

const createUser = createMutation((input: NewUser, signal: AbortSignal) =>
  api.post<User>('/users', { body: input, signal }),
);

const nextUser = await createUser.mutate({ name: 'Alice' });
qc.set(['users', nextUser.id], nextUser);
qc.invalidate(['users']);
```

## Documentation

- [Overview](https://vielzeug.dev/fetchit/)
- [Usage Guide](https://vielzeug.dev/fetchit/usage)
- [API Reference](https://vielzeug.dev/fetchit/api)
- [Examples](https://vielzeug.dev/fetchit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
