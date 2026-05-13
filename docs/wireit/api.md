---
title: Wireit API Reference
description: API reference for the Wireit dependency injection container.
---

# API Reference

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
