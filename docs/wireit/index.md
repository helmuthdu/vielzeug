---
title: Wireit — Dependency injection for TypeScript
description: Lightweight, type-safe dependency injection container with tokens, lifetimes, child scopes, and async providers. Zero dependencies.
---

<PackageBadges package="wireit" />

<img src="/logo-wireit.svg" alt="Wireit Logo" width="156" class="logo-highlight"/>

# Wireit

**Wireit** is a zero-dependency dependency injection container with typed tokens, singleton/transient/scoped lifetimes, child containers, and async providers.

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
const DbToken    = createToken<Database>('Database');
const RepoToken  = createToken<UserRepository>('UserRepository');
const SvcToken   = createToken<UserService>('UserService');

const container = createContainer();

// Register providers
container.registerFactory(DbToken, () => new Database(process.env.DB_URL!), { lifetime: 'singleton' });
container.register(RepoToken, { useClass: UserRepository, deps: [DbToken] });
container.register(SvcToken, { useClass: UserService, deps: [RepoToken] });

// Resolve
const service = container.get(SvcToken);
service.getUsers();
```

## Features

- **Typed tokens** — `createToken<T>('name')` ties TypeScript type to the token at compile time
- **Lifetimes** — `'singleton'`, `'transient'`, `'scoped'` per registration
- **Async providers** — `registerFactory` for async initialization, resolved via `getAsync()`
- **Child containers** — `createChild()` inherits parent registrations with scoped overrides
- **Scoped execution** — `runInScope(fn)` to run code within a scoped container
- **Debug view** — `container.debug()` lists all registrations and their lifetimes
- **Zero dependencies** — <PackageInfo package="wireit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Tokens, lifetimes, async providers, and child containers |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world DI patterns and framework integrations |
