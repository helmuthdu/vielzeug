---
title: Wireit — Typed dependency injection for TypeScript
description: Zero-dependency IoC container with typed tokens, lifetimes, async resolution, child containers, and first-class test utilities.
---

<PackageBadges package="wireit" />

<img src="/logo-wireit.svg" alt="Wireit logo" width="156" class="logo-highlight"/>

# Wireit

**Wireit** is a zero-dependency inversion of control (IoC) container for TypeScript. Register dependencies with typed tokens, resolve them synchronously or asynchronously, and scope lifetimes to containers or request cycles with full type inference.

<!-- Search keywords: dependency injection container, DI container, service composition. -->

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

const DbToken = createToken<Database>('Database');
const ServiceToken = createToken<UserService>('UserService');

const container = createContainer();

container
  .factory(DbToken, () => new Database(process.env.DB_URL!))
  .bind(ServiceToken, UserService, { deps: [DbToken] });

const service = container.get(ServiceToken);
```

## Why Wireit?

Manual dependency wiring gets hard to scale: constructors balloon, test setup repeats, and switching implementations requires touching many call sites.

```ts
// Before — manual wiring
const config = loadConfig();
const db = new Database(config.dbUrl);
const repo = new UserRepository(db);
const serviceBefore = new UserService(repo);

// After — Wireit
const container = createContainer();
container
  .value(ConfigToken, loadConfig())
  .factory(DbToken, (config) => new Database(config.dbUrl), { deps: [ConfigToken] })
  .bind(RepoToken, UserRepository, { deps: [DbToken] })
  .bind(SvcToken, UserService, { deps: [RepoToken] });

const serviceAfter = container.get(SvcToken);
```

| Feature              | Wireit                                       | InversifyJS | tsyringe |
| -------------------- | -------------------------------------------- | ----------- | -------- |
| Bundle size          | <PackageInfo package="wireit" type="size" /> | ~11 kB      | ~6 kB    |
| Decorators required  | ❌                                           | ✅          | ✅       |
| `reflect-metadata`   | ❌                                           | ✅          | ✅       |
| Typed tokens         | ✅ Explicit `createToken<T>()`               | Partial     | Partial  |
| Async providers      | ✅                                           | ✅          | ✅       |
| Child containers     | ✅                                           | ✅          | ✅       |
| Snapshot and restore | ✅                                           | ❌          | ❌       |
| Built-in mocking     | ✅ `container.mock()`                        | ❌          | ❌       |
| Zero dependencies    | ✅                                           | ❌          | ❌       |

**Use Wireit when** you want predictable, type-safe DI without decorators, metadata, or heavyweight framework conventions.

**Consider alternatives when** you already rely on decorator-based DI and want to stay aligned with that ecosystem.

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

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Permit](/permit/)
- [Fetchit](/fetchit/)
- [Workit](/workit/)
