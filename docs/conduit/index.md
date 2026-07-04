---
title: Conduit — Typed dependency injection for TypeScript
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
    trySyncResolve,
    resolveSyncOptional,
    resolveSyncOrDefault,
    ConduitError,
    ConduitCircularDependencyError,
    ConduitProviderNotFoundError,
    ConduitDuplicateRegistrationError,
    ConduitSyncResolutionError,
    ConduitScopedResolutionError,
    ConduitDisposedError,
    ConduitFrozenError,
    InferTokenTypes,
    ResolveInterceptor,
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
container.factory(UserRepo, async (r) => {
  const [db, logger] = await Promise.all([r.resolve(Db), r.resolve(Logger)]);
  return new UserRepo(db, logger);
});
container.factory(UserService, async (r) => {
  const [repo, logger] = await Promise.all([r.resolve(UserRepo), r.resolve(Logger)]);
  return new UserService(repo, logger);
});

const service = await container.resolve(UserService);
await container.dispose(); // all hooks run automatically
```

| Feature                     | Conduit                                       | tsyringe                                                      | InversifyJS                                                                         |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Bundle size                 | <PackageInfo package="conduit" type="size" /> | ~6 kB                                                         | ~45 kB                                                                              |
| Typed token ergonomics      | <ore-icon name="check" size="16"></ore-icon>  | Partial                                                       | Partial                                                                             |
| Async-first resolution      | <ore-icon name="check" size="16"></ore-icon>  | Partial                                                       | Partial                                                                             |
| Child container scopes      | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="check" size="16"></ore-icon>                  | <ore-icon name="check" size="16"></ore-icon>                                        |
| Explicit disposal lifecycle | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="x" size="16"></ore-icon>                      | Partial                                                                             |
| Decorator-free usage        | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="x" size="16"></ore-icon> (decorator-oriented) | <ore-icon name="triangle-alert" size="16"></ore-icon> (commonly decorator-oriented) |
| Zero dependencies           | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="check" size="16"></ore-icon>                  | <ore-icon name="x" size="16"></ore-icon>                                            |

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
container.factory(Service, async (r) => {
  const logger = await r.resolve(Logger);
  return { run: async () => logger.log('Running service') };
});

const service = await container.resolve(Service);
await service.run();

await container.dispose();
```

## Features

<div class="features-grid">

- Small core API — `token`, `scope`, `createContainer`, and a focused set of container methods
- Typed dependency contracts via Symbol tokens with phantom types
- Factory functions receive a `FactoryResolver` — dependencies resolved lazily via `r.resolve(Token)`
- Named scope tokens via `scope()` and `createScope()` for explicit lifecycle isolation
- Async-first resolution with singleton deduplication for concurrent callers
- Sync resolution path (`resolveSync`) for hot paths after warm-up — rethrows cached rejections for failed singletons
- Free-function helpers: `resolveSyncOptional`, `resolveSyncOrDefault`, `resolveOptional`, `resolveOrDefault`, `tryResolve`, `trySyncResolve`
- `resolveMany()` to resolve multiple tokens in parallel with typed tuples
- `resolveAll()` to eagerly warm all singletons; pass `{ includeScoped: true }` to also pre-warm named-scope factories
- `InferTokenTypes<T>` utility type to infer a typed tuple from a token array
- Registration existence check (`has`) without triggering factory execution
- `ContainerModule` + `loadModules()` for grouping and async provider setup
- `freeze()` to lock the container after startup; idempotent — safe to call multiple times; declare `deps:` on factories for static cycle detection at freeze time
- `inspect()` to get a serializable dependency graph
- `on()` to subscribe to container lifecycle events (each event carries a `source` field)
- `onResolve()` interceptor called after every successful resolution — for telemetry and hot-path observability
- Dispose hooks on both factory and value registrations; failures warn in dev instead of throwing
- Named scope containers for request/component/test scope boundaries
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
