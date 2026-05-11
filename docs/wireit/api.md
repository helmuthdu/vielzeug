---
title: Wireit API Reference
description: API reference for @vielzeug/wireit.
---

# API Reference

## Factory Functions

### createToken(description)

Creates a typed token.

```ts
const DbToken = createToken<IDatabase>('Database');
```

### createContainer()

Creates a root container.

```ts
const container = createContainer();
```

## Container Registration

### value(token, value, opts?)

Registers a plain value provider.

Options:

- `multi?: boolean`

### factory(token, fn, opts?)

Registers a factory provider.

Options:

- `deps?: Token[]`
- `lifetime?: 'singleton' | 'transient' | 'scoped'`
- `init?: (instance) => void | Promise<void>`
- `dispose?: (instance) => void | Promise<void>`
- `multi?: boolean`

### bind(token, cls, opts?)

Registers a class provider.

Options are identical to `factory(...)`.

## Container Resolution

### resolve(token)

Asynchronously resolves a token.

Throws:

- `ProviderNotFoundError` when the token is not registered
- `MultipleProvidersError` when the token has multiple providers
- `CircularDependencyError` on dependency cycles

### resolveMany(token)

Asynchronously resolves all providers registered for a token.

```ts
const validators = await container.resolveMany(ValidatorToken);
```

Returns an empty array when the token has no providers.

## Container Lifecycle

### createChild()

Creates a child container inheriting parent registrations.

### dispose()

Disposes resolved singleton and scoped instances.

If one or more dispose hooks fail, `dispose()` throws `AggregateError`.

### disposed

Readonly boolean indicating disposal state.

## Errors

- `ProviderNotFoundError`
- `MultipleProvidersError`
- `CircularDependencyError`
- `ContainerDisposedError`

## Types

- `Token<T>`
- `Lifetime`
- `ValueProvider<T>`
- `ClassProvider<T, Deps>`
- `FactoryProvider<T, Deps>`
- `Provider<T>`
- `ProviderOptions<T, Deps>`
