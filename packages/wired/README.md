---
description: Typed dependency injection for TypeScript.
package: wired
category: di
keywords: [dependency-injection, ioc, container, singleton, transient, factory, scoped]
related: [rune, relay, permit]
exports: [createContainer, createToken]
---

# /wired

> Typed dependency injection for TypeScript.

[![npm version](https://img.shields.io/npm/v//wired)](https://www.npmjs.com/package//wired) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/wired` &nbsp;·&nbsp; **Category:** Di

**Key exports:** `createContainer`, `createToken`

**When to use:** Type-safe DI container with async-first resolution, singleton/transient/scoped lifetimes, child scopes, disposal hooks, and circular dependency detection.

**Related:** [@vielzeug/rune](https://vielzeug.dev/rune/) · [@vielzeug/relay](https://vielzeug.dev/relay/) · [@vielzeug/permit](https://vielzeug.dev/permit/)

</details>

`/wired` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /wired
npm install /wired
yarn add /wired
```

## Quick Start

```ts
import { createContainer, createToken } from '/wired';

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

- [Overview](https://vielzeug.dev/wired/)
- [Usage Guide](https://vielzeug.dev/wired/usage)
- [API Reference](https://vielzeug.dev/wired/api)
- [Examples](https://vielzeug.dev/wired/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
