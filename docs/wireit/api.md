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

### createTestContainer(base?)

Creates an isolated child container for tests.

```ts
const testContainer = createTestContainer(appContainer);
afterEach(() => testContainer.dispose());
```

## Container Registration

### value(token, value, opts?)

Registers a plain value provider.

### factory(token, fn, opts?)

Registers a factory provider.

### bind(token, cls, opts?)

Registers a class provider.

### alias(token, source)

Maps one token to another token.

### unregister(token)

Removes a local registration.

### clear()

Clears local registrations and aliases without disposal.

## Container Resolution

### resolve(token)

Asynchronously resolves a token.

### resolveAll(tokens)

Asynchronously resolves multiple tokens as a typed tuple.

```ts
const [db, logger] = await container.resolveAll([DbToken, LoggerToken]);
```

### resolveOptional(token)

Asynchronously resolves a token, returning `undefined` when missing.

### has(token)

Checks whether the token is resolvable (local or parent).

## Container Lifecycle

### createChild()

Creates a child container inheriting parent registrations.

### runInScope(fn)

Runs a callback in an auto-disposed child container.

### dispose()

Disposes resolved singleton and scoped instances.

### disposed

Readonly boolean indicating disposal state.

## Testing Utilities

### mock(token, provider, fn)

Temporarily overrides a provider for the callback duration.

```ts
await container.mock(DbToken, { useValue: fakeDb }, async () => {
  await service.run();
});
```

### snapshot()

Captures local registrations and aliases.

### restore(snapshot)

Restores a captured snapshot.

### debug()

Returns token and alias metadata, including provider kind, lifetime, and resolution state.

## Errors

- `ProviderNotFoundError`
- `CircularDependencyError`
- `AliasCycleError`
- `ContainerDisposedError`

## Types

- `Token<T>`
- `Lifetime`
- `ValueProvider<T>`
- `ClassProvider<T, Deps>`
- `FactoryProvider<T, Deps>`
- `Provider<T>`
- `ProviderOptions<T, Deps>`
- `TokenValues<T>`
- `Snapshot`
