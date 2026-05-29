---
title: Wired API Reference
description: API reference for the Wired dependency injection container.
---

[[toc]]

## Package Entry Point

| Import                | Purpose                |
| --------------------- | ---------------------- |
| `@vielzeug/wired`    | Main exports and types |

## API At a Glance

| Symbol                      | Purpose                                        | Execution mode | Common gotcha                                      |
| --------------------------- | ---------------------------------------------- | -------------- | -------------------------------------------------- |
| `createToken()`             | Create a typed DI token (Symbol-backed)        | Sync           | Tokens must be unique — use descriptive labels     |
| `createContainer()`         | Create a new DI container                      | Sync           | Register all providers before resolving            |
| `container.value()`         | Register a static value                        | Sync           | Value is used as-is, not wrapped                   |
| `container.factory()`       | Register a lazy factory (sync or async)        | Sync/Async     | Async factories make `resolve()` async             |
| `container.resolve()`       | Resolve a token to its implementation          | Async          | Throws if token is not registered                  |
| `container.createChild()`   | Create a scoped child container                | Sync           | Child inherits parent registrations                |
| `container.dispose()`       | Dispose container and call cleanup hooks       | Async          | Call during app teardown to avoid resource leaks   |

## createToken(description)

Creates a typed symbol token.

```ts
const Service = createToken<Service>('Service');
```

## createContainer()

Creates a new root container.

```ts
const container = createContainer();
```

## Container

### `container.value(token, value, opts?)`

Registers a constant provider.

### `container.factory(token, fn, opts?)`

Registers a factory provider.

```ts
container.factory(Service, (logger) => new ServiceImpl(logger), {
  deps: [Logger],
  lifetime: 'singleton',
});
```

### `container.resolve(token)`

Resolves a single provider.

### `container.resolveMany(token)`

Resolves every provider registered for a token.

### `container.resolveOptional(token)`

Resolves a token when available and returns `undefined` when no provider exists.

### `container.createChild()`

Creates a child container that can inherit registrations from its parent.

### `container.dispose()`

Disposes resolved instances and prevents further use.

### `container.disposed`

Returns `true` after disposal.

## Types

- `Token<T>`
- `Lifetime`
- `Provider<T>`
- `ProviderOptions<T, Deps>`
- `ValueProvider<T>`
- `FactoryProvider<T, Deps>`

## Errors

- `CircularDependencyError`
- `ProviderNotFoundError`
- `MultipleProvidersError`
- `ContainerDisposedError`
