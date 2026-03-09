---
title: Wireit — Dependency injection for TypeScript
description: Lightweight, type-safe dependency injection container with tokens, lifetimes, child scopes, and async providers. Zero dependencies.
---

<PackageBadges package="wireit" />

<img src="/logo-wireit.svg" alt="Wireit Logo" width="156" class="logo-highlight"/>

# Wireit

**Wireit** is a zero-dependency dependency injection container with typed tokens, singleton/transient/scoped lifetimes, child containers, async providers, and snapshot-based test utilities.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/wireit
```

```sh [npm]
npm install @vielzeug/wireit
```

```sh [yarn]
yarn add @vielzeug/wireit
```

:::

## Quick Start

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// Create typed tokens
const DbToken   = createToken<Database>('Database');
const RepoToken = createToken<UserRepository>('UserRepository');
const SvcToken  = createToken<UserService>('UserService');

const container = createContainer();

// Register providers
container.register(DbToken, {
  useFactory: () => new Database(process.env.DB_URL!),
  lifetime: 'singleton',
});
container.register(RepoToken, { useClass: UserRepository, deps: [DbToken] });
container.register(SvcToken,  { useClass: UserService,    deps: [RepoToken] });

// Resolve
const service = container.get(SvcToken);
service.getUsers();
```

## Features

- **Typed tokens** — `createToken<T>('name')` ties a TypeScript type to the token at compile time
- **Three provider kinds** — `useValue`, `useClass`, `useFactory` (sync or async)
- **Lifetimes** — `'singleton'` (default), `'transient'`, `'scoped'` per registration
- **Async providers** — `useFactory` may return a `Promise`; resolve with `getAsync()`
- **Child containers** — `createChild()` inherits parent registrations; scoped deps get one instance per child
- **Scoped execution** — `runInScope(fn)` creates a temporary child container, auto-cleared when `fn` returns
- **Aliases** — `alias(token, source)` redirects a token to another, with chain and cycle detection
- **Snapshot/restore** — `snapshot()` / `restore()` for test isolation
- **Test utilities** — `createTestContainer` and `withMock` for isolated, auto-cleanup test setups
- **Debug view** — `container.debug()` lists all registered tokens and aliases
- **Zero dependencies** — <PackageInfo package="wireit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Tokens, providers, lifetimes, child containers, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world DI patterns |
