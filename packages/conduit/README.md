---
description: Typed dependency injection for TypeScript.
package: conduit
category: di
keywords: [dependency-injection, ioc, container, singleton, transient, factory, named-scope]
related: [rune, herald, ward]
exports:
  [
    createContainer,
    token,
    scope,
    loadModules,
    resolveOptional,
    resolveOrDefault,
    tryResolve,
    resolveSyncOptional,
    resolveSyncOrDefault,
    ContainerError,
    CircularDependencyError,
    ProviderNotFoundError,
    DuplicateRegistrationError,
    SyncResolutionError,
    ScopedResolutionError,
    ContainerDisposedError,
    ContainerFrozenError,
  ]
---

# @vielzeug/conduit

> Typed dependency injection for TypeScript.

[![npm version](https://img.shields.io/npm/v/@vielzeug/conduit)](https://www.npmjs.com/package/@vielzeug/conduit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/conduit` &nbsp;·&nbsp; **Category:** Di

**Key exports:** `createContainer`, `token`, `scope`, `loadModules`

**When to use:** Type-safe DI container with async-first resolution, singleton/transient/named-scope lifetimes, scope containers, disposal hooks, and cycle detection.

**Related:** [@vielzeug/rune](https://vielzeug.dev/rune/) · [@vielzeug/herald](https://vielzeug.dev/herald/) · [@vielzeug/ward](https://vielzeug.dev/ward/)

</details>

`@vielzeug/conduit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/conduit
npm install @vielzeug/conduit
yarn add @vielzeug/conduit
```

## Quick Start

```ts
import { createContainer, token, loadModules, type ContainerModule } from '@vielzeug/conduit';

const Logger = token<{ log(message: string): void }>('Logger');
const Service = token<{ run(): Promise<void> }>('Service');

const appModule: ContainerModule = (c) => {
  c.value(Logger, console);
  c.factory(Service, async (r) => {
    const logger = await r.resolve(Logger);
    return { run: async () => logger.log('running') };
  });
};

const container = createContainer();
await loadModules(container, appModule);

const service = await container.resolve(Service);
await service.run();

await container.dispose();
```

## Features

- Typed symbol tokens via `token()` with phantom type inference
- Named scope tokens via `scope()` and `createScope()` for explicit lifecycle control
- `value()` and `factory()` registration with optional dispose hooks
- `singleton`, `transient`, and named-scope lifetimes
- Async-first `resolve()` with concurrent-caller deduplication
- Sync `resolveSync()` for cached values and post-warm-up hot paths
- `resolveMany()` to resolve multiple tokens in parallel with typed tuples
- `resolveAll()` to eagerly warm all singletons at startup
- `has()` to check registration without executing the factory
- `ContainerModule` for grouping and async provider setup via `loadModules()`
- `freeze()` to lock the container after startup (runs cycle detection)
- `inspect()` to get a serializable dependency graph
- `on()` to subscribe to container lifecycle events with `source` metadata
- Named scope containers for request, job, or test scopes
- `Symbol.asyncDispose` support for `await using`
- Free-function helpers: `resolveOptional`, `resolveOrDefault`, `tryResolve`, `resolveSyncOptional`, `resolveSyncOrDefault`

## Errors

| Error                        | When thrown                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `ProviderNotFoundError`      | `resolve()` called for an unregistered token; message includes container name     |
| `DuplicateRegistrationError` | `value()` or `factory()` called for an already-registered token                   |
| `SyncResolutionError`        | `resolveSync()` called for a transient or not-yet-resolved factory                |
| `ScopedResolutionError`      | `resolve()` called outside a matching named-scope container                       |
| `CircularDependencyError`    | `freeze()` detected a cycle; message includes the full path                       |
| `ContainerDisposedError`     | Any operation called after `dispose()`; message includes container name           |
| `ContainerFrozenError`       | `value()` or `factory()` called after `freeze()`; message includes container name |

## Documentation

- [Overview](https://vielzeug.dev/conduit/)
- [Usage Guide](https://vielzeug.dev/conduit/usage)
- [API Reference](https://vielzeug.dev/conduit/api)
- [Examples](https://vielzeug.dev/conduit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
