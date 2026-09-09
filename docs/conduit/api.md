---
title: Conduit — API Reference
description: Reference for Conduit tokens, immutable provider arrays, dependency-first factories, scopes, composition-root resolution, and lifecycle disposal.
---

[[toc]]

## API Overview

| Symbol | Purpose | Mode | Common gotcha |
| --- | --- | --- | --- |
| `token` | Create typed dependency identity | Sync | Same description does not mean same token |
| `scope` | Create named lifecycle identity | Sync | Must match factory lifetime |
| `createContainer` | Build root container from an immutable provider array | Sync | Validates the full graph at construction |
| `valueProvider` / `factoryProvider` | Build type-safe immutable registrations | Sync | Prefer over unannotated object literals |
| `Provider` | Value or factory registration type | Sync | One local registration per token |
| `has` | Check registration visibility | Sync | Walks parent containers |
| `resolve` | Resolve one token or typed composition-root map | Async | Undeclared map tokens fail at resolution |
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

Tokens and scopes are unique symbols. Descriptions exist only for diagnostics. `disposalSignalToken` is a built-in `Token<AbortSignal>` that resolves to the owning root, transient-requesting container, or named scope signal.

## Container

```ts
createContainer(providers: readonly Provider[], options?: { name?: string }): Container
```

`providers` is an immutable array of value and factory providers. Construction validates the entire graph — duplicate tokens, missing dependencies, circular factory tuples, and singletons depending on scoped factories all fail fast.

### Providers

```ts
type Provider<T, Dependencies> = ValueProvider<T> | FactoryProvider<T, Dependencies>;

valueProvider<T>(token: Token<T>, value: T, options?: ValueOptions<T>): ValueProvider<T>;
factoryProvider<T, Dependencies>(
  token: Token<T>,
  dependencies: Dependencies,
  factory: (...values: InferTokens<Dependencies>) => Promise<T> | T,
  options?: FactoryOptions<T>,
): FactoryProvider<T, Dependencies>;
```

Use builders for token-driven value and dependency inference:

```ts
valueProvider(Config, { baseUrl: '/api' }, { dispose: (value) => value.close() });
factoryProvider(Service, [Api, Logger], (api, logger) => createService(api, logger), {
  lifetime: 'singleton',
  dispose: (value) => value.dispose(),
});
```

Explicit `ValueProvider<T>` and `FactoryProvider<T, Dependencies>` annotations remain available for reusable provider declarations. Avoid unannotated provider object literals because TypeScript cannot contextually infer one factory parameter from another object property.

`dependencies` is copied at construction and drives creation, validation, cycle detection, and teardown order. Factories may return a value or promise.

`lifetime` accepts `'singleton'` (default), `'transient'`, or a `ScopeToken`. Singletons cannot capture transient or scoped factories. Named-scope factories may depend on singletons, transients, or factories in the same named scope.

```ts
type FactoryProvider<T, Dependencies> = {
  token: Token<T>;
  dependencies: Dependencies;
  factory: (...values: InferTokens<Dependencies>) => Promise<T> | T;
  dispose?: (value: T) => void | Promise<void>;
  lifetime?: 'singleton' | 'transient' | ScopeToken;
};
```

### has

```ts
container.has(token): boolean
```

Checks local and parent registrations without creating a factory result.

### resolve

```ts
container.resolve(token: Token<T>): Promise<T>
container.resolve(map: ServiceMap): Promise<InferServices<typeof map>>
```

Resolves one typed token or a service object at a composition root. Map keys are defined as own properties, including `__proto__`, without changing the result prototype. Missing top-level tokens fail during resolution.

```ts
const services = await container.resolve({ client: Client, config: Config });
```

Singleton resolutions deduplicate concurrent callers and cache successful values. A rejected creation attempt is evicted so a later resolution can retry.

### createScope

```ts
container.createScope(
  scope?: ScopeToken,
  options?: { name?: string; providers?: readonly Provider[] },
): Container
```

A matching scope owns resources registered with its `ScopeToken` lifetime. Immutable local providers may shadow parent registrations for request or test overrides. Disposing a parent also disposes active children.

### dispose

```ts
container.dispose(): Promise<void>
container.disposalSignal: AbortSignal
container.disposed: boolean
```

Disposal blocks new work, aborts `disposalSignal`, disposes active child scopes, waits for complete in-flight creation and late-result cleanup, then disposes owned resources in reverse creation order. Cleanup failures are aggregated in the readonly `ConduitDisposeError.errors` array.

## Types

```ts
type Token<T = unknown> = symbol;
type ScopeToken = symbol;
type Lifetime = 'singleton' | 'transient' | ScopeToken;

type InferTokens<T extends readonly Token<unknown>[]> = {
  [K in keyof T]: T[K] extends Token<infer Value> ? Value : never;
};

type ServiceMap = { readonly [key: string]: Token<unknown> };

type InferServices<M extends ServiceMap> = {
  readonly [K in keyof M]: M[K] extends Token<infer Value> ? Value : never;
};

interface Container {
  createScope(scope?: ScopeToken, options?: { name?: string; providers?: readonly Provider[] }): Container;
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  has<T>(token: Token<T>): boolean;
  readonly name: string;
  resolve<T>(token: Token<T>): Promise<T>;
  resolve<M extends ServiceMap>(map: M): Promise<InferServices<M>>;
  [Symbol.asyncDispose](): Promise<void>;
}
```

## Errors

- `ConduitError` — base class; use `instanceof ConduitError` to narrow package errors.
- `ConduitProviderNotFoundError` — dependency has no registration.
- `ConduitCircularDependencyError` — static factory tuple graph contains a cycle.
- `ConduitDuplicateRegistrationError` — token registered twice in one container.
- `ConduitScopedResolutionError` — scoped factory resolved without matching scope, or a singleton depends on a scoped factory.
- `ConduitDisposedError` — operation attempted after disposal began.
- `ConduitDisposeError` — one or more cleanup hooks failed.
