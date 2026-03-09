---
title: Wireit — Typed dependency injection for TypeScript
description: Zero-dependency IoC container with typed tokens, lifetimes, async resolution, child containers, and first-class test utilities.
---

<PackageBadges package="wireit" />

<img src="/logo-wireit.svg" alt="Wireit Logo" width="156" class="logo-highlight"/>

# Wireit

**Wireit** is a zero-dependency IoC container for TypeScript. Register dependencies with typed tokens, resolve them synchronously or asynchronously, and scope lifetimes to containers or request cycles — all with full type inference.

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

const DbToken      = createToken<Database>('Database');
const ServiceToken = createToken<UserService>('UserService');

const container = createContainer();

container
  .factory(DbToken, () => new Database(process.env.DB_URL!))
  .bind(ServiceToken, UserService, { deps: [DbToken] });

const service = container.get(ServiceToken);
```

## Features

- **Typed tokens** — `createToken<T>(description)` gives every dependency a compile-time type and a human-readable name
- **Three registration styles** — `register()`, `factory()` shorthand, `bind()` shorthand, and `value()` for constants
- **Lifetimes** — `singleton` (default), `transient`, and `scoped` per-child-container
- **Async providers** — factories may return `Promise<T>`; resolve via `getAsync()` and `getAllAsync()`
- **Dispose hooks** — per-provider `dispose(instance)` called on `container.dispose()`; `[Symbol.asyncDispose]` for `await using`
- **Child containers** — `createChild()` inherits registrations; scoped instances are isolated per child
- **Scoped execution** — `runInScope(fn)` creates and auto-disposes a child container
- **Aliases** — `alias(token, source)` maps interfaces to implementations, resolved through the full parent chain
- **Batch resolution** — `getAll` and `getAllAsync` return typed tuples
- **Optional resolution** — `getOptional` and `getOptionalAsync` return `undefined` when missing
- **Test utilities** — `createTestContainer()` and `container.mock()` for isolated unit tests
- **Snapshot/Restore** — `snapshot()` / `restore()` for fine-grained test state control
- **Debug** — `debug()` walks the full hierarchy and lists all tokens and aliases
- **Zero dependencies** — <PackageInfo package="wireit" type="size" /> gzipped

## Next Steps

|                           |                                                                  |
| ------------------------- | ---------------------------------------------------------------- |
| [Usage Guide](./usage.md) | Tokens, providers, lifetimes, async, child containers, testing   |
| [API Reference](./api.md) | Complete type signatures and method documentation                |
| [Examples](./examples.md) | Real-world DI patterns and framework integrations                |
