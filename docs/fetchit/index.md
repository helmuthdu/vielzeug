---
title: Fetchit — HTTP client for TypeScript
description: Lightweight, type-safe HTTP client with request caching, path parameters, custom headers, and a query client. Zero dependencies.
---

<PackageBadges package="fetchit" />

<img src="/logo-fetchit.svg" alt="Fetchit Logo" width="156" class="logo-highlight"/>

# Fetchit

**Fetchit** is a lightweight HTTP client with request caching, typed path parameters, and a query client built on the native `fetch` API. Zero dependencies.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/fetchit
```

```sh [npm]
npm install @vielzeug/fetchit
```

```sh [yarn]
yarn add @vielzeug/fetchit
```

:::

## Quick Start

```ts
import { createHttpClient } from '@vielzeug/fetchit';

const http = createHttpClient({ baseUrl: 'https://api.example.com' });

// GET with typed response
const users = await http.get<User[]>('/users');

// POST with body
const user = await http.post<User>('/users', { body: { name: 'Alice', email: 'alice@example.com' } });

// Path parameters — supports both :param and {param} syntax
const post = await http.get<Post>('/users/:userId/posts/:postId', {
  params: { userId: '1', postId: '42' },
});

// Custom headers per request
const data = await http.get('/protected', {
  headers: { Authorization: 'Bearer token' },
});

// Error handling
try {
  await http.get('/not-found');
} catch (err) {
  if (err instanceof HttpError) {
    console.log(err.status, err.url, err.method);
  }
}
```

## Features

- **Type-safe responses** — generic type parameter for automatic inference
- **Path parameters** — `:param` and `{param}` syntax for URL templating
- **Base URL** — configure once, use everywhere
- **Custom headers** — global via `setHeaders()`, per-request via options
- **Query client** — `createQueryClient()` for request deduplication and caching
- **Interceptors** — `use()` middleware for auth, logging, and request transforms
- **HttpError** — structured error with `url`, `method`, `status`, and `cause` properties
- **Zero dependencies** — <PackageInfo package="fetchit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | HTTP methods, caching, mutations, interceptors, and more |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world HTTP patterns and framework integrations |
