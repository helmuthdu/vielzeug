---
title: Conduit — API Reference
description: Reference for Conduit tokens, dependency-first factories, scopes, validation, and lifecycle disposal.
---

[[toc]]

## API Overview

| Symbol | Purpose | Mode | Common gotcha |
| --- | --- | --- | --- |
| `token` | Create typed dependency identity | Sync | Same description does not mean same token |
| `scope` | Create named lifecycle identity | Sync | Must match factory lifetime |
| `createContainer` | Create root registry | Sync | Dispose when application ends |
| `value` | Register an existing value | Sync | One registration per token/container |
| `factory` | Register static dependency factory | Sync | Tuple is copied and authoritative |
| `has` | Check registration visibility | Sync | Walks parent containers |
| `resolve` | Resolve one dependency | Async | Missing provider throws |
| `validate` | Validate static graph | Sync | Run after registration |
| `createScope` | Create child owner | Sync | Named scope required for scoped factories |
| `dispose` | Release owned resources | Async | May throw `ConduitDisposeError` after cleanup attempts |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/conduit` | Complete Conduit API |

## Tokens and Scopes

```ts
token<T>(description: string): Token<T>
scope(name: string): ScopeToken
```

Tokens and scopes are unique symbols. Descriptions exist only for diagnostics.

## Container

```ts
createContainer(options?: { name?: string }): Container
```

### value

```ts
container.value(token, value, options?)
```

`options.dispose` runs during container disposal.

### has

```ts
container.has(token): boolean
```

Checks local and parent registrations without creating a factory result.

### factory

```ts
container.factory(token, dependencies, create, options?)
```

```ts
container.factory(Service, [Api, Logger], (api, logger) => createService(api, logger));
```

`dependencies` is copied at registration and drives creation, validation, cycle detection, and teardown order. Factories may return a value or promise.

`options.lifetime` accepts `'singleton'`, `'transient'`, or `ScopeToken`. A singleton cannot depend on a scoped resource.

```ts
type FactoryOptions<T> = {
  dispose?: (value: T) => void | Promise<void>;
  lifetime?: 'singleton' | 'transient' | ScopeToken;
};
```

### resolve

```ts
container.resolve(token): Promise<T>
```

Singleton resolutions deduplicate concurrent callers.

### validate

```ts
container.validate(): Container
```

Throws for missing dependencies and circular factory tuples.

### createScope

```ts
container.createScope(scope?: ScopeToken, options?: { name?: string }): Container
```

A matching scope owns resources registered with its `ScopeToken` lifetime. Disposing a parent also disposes its active child scopes.

### dispose

```ts
container.dispose(): Promise<void>
container.disposalSignal: AbortSignal
container.disposed: boolean
```

Disposal blocks new work, aborts `disposalSignal`, disposes active child scopes, waits for in-flight creation, then disposes owned resources in reverse creation order. Cleanup failures are aggregated in `ConduitDisposeError.errors`.

## Types

```ts
type Token<T> = symbol;
type ScopeToken = symbol;
type Lifetime = 'singleton' | 'transient' | ScopeToken;
type InferTokens<Tokens> = { [K in keyof Tokens]: Tokens[K] extends Token<infer T> ? T : never };
```

## Errors

- `ConduitError` — base class; `ConduitError.is(error)` narrows package errors.
- `ConduitProviderNotFoundError` — dependency has no registration.
- `ConduitCircularDependencyError` — static factory tuple graph contains a cycle.
- `ConduitDuplicateRegistrationError` — token registered twice in one container.
- `ConduitScopedResolutionError` — scoped factory resolved without matching scope.
- `ConduitDisposedError` — operation attempted after disposal began.
- `ConduitDisposeError` — one or more cleanup hooks failed.
