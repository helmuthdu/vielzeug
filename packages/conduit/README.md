---
description: Typed dependency injection for TypeScript.
package: conduit
category: di
keywords: [dependency-injection, ioc, container, singleton, transient, factory, scoped]
related: [rune, herald, ward]
exports: [createContainer, createToken]
---

# @vielzeug/conduit

> Typed dependency injection for TypeScript.

[![npm version](https://img.shields.io/npm/v/@vielzeug/conduit)](https://www.npmjs.com/package/@vielzeug/conduit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/conduit` &nbsp;·&nbsp; **Category:** Di

**Key exports:** `createContainer`, `createToken`

**When to use:** Type-safe DI container with async-first resolution, singleton/transient/scoped lifetimes, child scopes, disposal hooks, and circular dependency detection.

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
import { createContainer, createToken } from '@vielzeug/conduit';

const Logger = createToken<{ log(message: string): void }>('Logger');
const Service = createToken<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, console);
container.factory(
  Service,
  (logger) => ({ run: async () => logger.log('running') }),
  { deps: [Logger] },
);

const service = await container.resolve(Service);
await service.run();

// Check registration without triggering the factory
if (container.has(Logger)) {
  const logger = container.resolveSync(Logger); // sync after warm-up
}

await container.dispose();
```

## Features

- Typed symbol tokens with phantom type inference
- `value()` and `factory()` registration with optional dispose hooks
- `singleton`, `transient`, and `scoped` lifetimes
- Async-first `resolve()` with concurrent-caller deduplication
- Sync `resolveSync()` for cached values and post-warm-up hot paths
- `has()` to check registration without executing the factory
- Child containers for request, job, or test scopes
- `Symbol.asyncDispose` support for `await using`
- Circular dependency detection with full path in the error message

## Errors

| Error                    | When thrown                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `ProviderNotFoundError`  | `resolve()` called for an unregistered token                             |
| `MultipleProvidersError` | `resolve()` or `resolveSync()` called on a multi token                   |
| `SyncResolutionError`    | `resolveSync()` called for a transient or not-yet-resolved factory       |
| `ScopedResolutionError`  | `resolve()` or `resolveSync()` called on the root container for a scoped token |
| `CircularDependencyError`| Dependency graph contains a cycle                                        |
| `ContainerDisposedError` | Any operation called after `dispose()`                                   |

## Documentation

- [Overview](https://vielzeug.dev/conduit/)
- [Usage Guide](https://vielzeug.dev/conduit/usage)
- [API Reference](https://vielzeug.dev/conduit/api)
- [Examples](https://vielzeug.dev/conduit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
