---
title: Conduit — Typed dependency injection for TypeScript
description: Typed dependency injection for TypeScript.
package: conduit
category: di
keywords: [dependency-injection, ioc, container, singleton, transient, factory, scoped]
related: [rune, herald, ward]
exports:
  [
    createContainer,
    token,
    scope,
    CircularDependencyError,
    ProviderNotFoundError,
    DuplicateRegistrationError,
    SyncResolutionError,
    ScopedResolutionError,
    ContainerDisposedError,
    ContainerFrozenError,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="conduit" />

## Why Conduit?

Manual dependency wiring often spreads across modules, making lifetimes and teardown behavior difficult to reason about in larger systems.

```ts
// Before — manual wiring, no lifecycle, no type safety
const logger = new ConsoleLogger();
const db = await connectDb(process.env.DATABASE_URL);
const repo = new UserRepo(db, logger);
const service = new UserService(repo, logger);
// cleanup is your problem

// After — explicit tokens, typed resolution, disposal hooks
const container = createContainer();
container.value(Logger, new ConsoleLogger());
container.factory(Db, () => connectDb(process.env.DATABASE_URL), { dispose: (db) => db.close() });
container.factory(UserRepo, (db, logger) => new UserRepo(db, logger), { deps: [Db, Logger] });
container.factory(UserService, (repo, logger) => new UserService(repo, logger), { deps: [UserRepo, Logger] });

const service = await container.resolve(UserService);
await container.dispose(); // all hooks run automatically
```

| Feature                     | Conduit                                       | tsyringe                | InversifyJS                      |
| --------------------------- | --------------------------------------------- | ----------------------- | -------------------------------- |
| Bundle size                 | <PackageInfo package="conduit" type="size" /> | ~6 kB                   | ~45 kB                           |
| Typed token ergonomics      | <sg-icon name="check" size="16"></sg-icon>                                            | Partial                 | Partial                          |
| Async-first resolution      | <sg-icon name="check" size="16"></sg-icon>                                            | Partial                 | Partial                          |
| Child container scopes      | <sg-icon name="check" size="16"></sg-icon>                                            | <sg-icon name="check" size="16"></sg-icon>                      | <sg-icon name="check" size="16"></sg-icon>                               |
| Explicit disposal lifecycle | <sg-icon name="check" size="16"></sg-icon>                                            | <sg-icon name="x" size="16"></sg-icon>                      | Partial                          |
| Decorator-free usage        | <sg-icon name="check" size="16"></sg-icon>                                            | <sg-icon name="x" size="16"></sg-icon> (decorator-oriented) | <sg-icon name="triangle-alert" size="16"></sg-icon> (commonly decorator-oriented) |
| Zero dependencies           | <sg-icon name="check" size="16"></sg-icon>                                            | <sg-icon name="check" size="16"></sg-icon>                      | <sg-icon name="x" size="16"></sg-icon>                               |

<div class="decision-callout">

**Use Conduit when** you need a compact typed container with explicit scopes and lifecycle control.

**Consider decorator-heavy DI frameworks when** your project is already standardized around metadata/decorator injection patterns.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/conduit
```

```sh [npm]
npm install @vielzeug/conduit
```

```sh [yarn]
yarn add @vielzeug/conduit
```

:::

## Quick Start

```ts
import { createContainer, token } from '@vielzeug/conduit';

const Logger = token<{ log(message: string): void }>('Logger');
const Service = token<{ run(): Promise<void> }>('Service');

const container = createContainer();

container.value(Logger, console);
container.factory(Service, (logger) => ({ run: async () => logger.log('Running service') }), {
  deps: [Logger],
});

const service = await container.resolve(Service);
await service.run();

await container.dispose();
```

## Features

<div class="features-grid">

- Small core API — `token`, `scope`, `createContainer`, and a focused set of container methods
- Typed dependency contracts via Symbol tokens with phantom types
- Named scope tokens via `scope()` and `createScope()` for explicit lifecycle isolation
- Async-first resolution with singleton deduplication for concurrent callers
- Sync resolution path (`resolveSync`) for hot paths after warm-up
- `resolveMany()` to resolve multiple tokens in parallel with typed tuples
- `tryResolve()` for result-object resolution without throwing
- `resolveAll()` to eagerly warm all singletons and validate startup
- Registration existence check (`has`) without triggering factory execution
- `ContainerModule` for grouping related registrations and async setup
- `validate()` for registration-time cycle detection
- `freeze()` to lock the container after startup
- `inspect()` to get a serializable dependency graph
- `on()` to subscribe to container lifecycle events
- Dispose hooks on both factory and value registrations
- Child containers for request/component/test scope boundaries
- Explicit disposal lifecycle with `Symbol.asyncDispose` support

</div>


## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Familiar](../familiar/index.md) for dependency-managed worker orchestration.
- [Herald](../herald/index.md) for pub/sub coordination in container-managed modules.
- [Ward](../ward/index.md) for injecting authorization services.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
