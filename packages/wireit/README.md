# @vielzeug/wireit

> Lightweight typed dependency injection container for TypeScript with tokens, lifetimes, async resolution, child containers, and test utilities

[![npm version](https://img.shields.io/npm/v/@vielzeug/wireit)](https://www.npmjs.com/package/@vielzeug/wireit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Wireit** is a zero-dependency IoC container built around typed tokens — register and resolve dependencies with singleton/transient/scoped lifetimes, async factories, dispose hooks, child containers, and first-class test helpers.

## Installation

```sh
pnpm add @vielzeug/wireit
# npm install @vielzeug/wireit
# yarn add @vielzeug/wireit
```

## Quick Start

```typescript
import { createContainer, createToken } from '@vielzeug/wireit';

const DbToken = createToken<Database>('Database');
const ServiceToken = createToken<UserService>('UserService');

const container = createContainer();

container
  .factory(DbToken, () => new Database(process.env.DB_URL!))
  .bind(ServiceToken, UserService, { deps: [DbToken] });

const service = container.get(ServiceToken);
```

## Features

- ✅ **Typed tokens** — `createToken<T>(description)` — type-safe, no magic strings
- ✅ **Three registration styles** — `register()`, `factory()` shorthand, `bind()` shorthand
- ✅ **Plain values** — `container.value(token, value)` for constants and config
- ✅ **Lifetimes** — `singleton` (default), `transient`, and `scoped` per-child-container
- ✅ **Async providers** — factories may return `Promise<T>`; resolve with `getAsync()`
- ✅ **Dispose hooks** — per-provider `dispose(instance)` called on `container.dispose()`
- ✅ **Child containers** — `createChild()` inherits registrations; `scoped` lifetime creates one instance per child
- ✅ **Scoped execution** — `runInScope(fn)` creates, uses, and auto-disposes a child
- ✅ **Aliases** — `alias(token, source)` maps one token to another, resolved through parent chain
- ✅ **Batch resolution** — `getAll([...tokens])` and `getAllAsync([...tokens])` return typed tuples
- ✅ **Optional resolution** — `getOptional()` and `getOptionalAsync()` return `undefined` when missing
- ✅ **Test helpers** — `createTestContainer(base?)` and `container.mock(token, mock, fn)`
- ✅ **Snapshot/Restore** — `snapshot()` and `restore(snap)` for stateless test isolation
- ✅ **Debug** — `debug()` walks the full parent chain and lists all tokens and aliases
- ✅ **Zero dependencies** — <2 kB gzipped, pure TypeScript ESM

## Usage

### Tokens

Every dependency is identified by a typed token, not a string or class reference:

```typescript
import { createToken } from '@vielzeug/wireit';

const ConfigToken = createToken<AppConfig>('AppConfig');
const DbToken = createToken<Database>('Database');
const ServiceToken = createToken<UserService>('UserService');
```

The description is required — it appears in error messages and `debug()` output.

### Registering Providers

#### Value

Use `value()` for constants, config, and plain objects:

```typescript
container.value(ConfigToken, { apiUrl: 'https://api.example.com', timeout: 5000 });
```

#### Factory

Use `factory()` for any function that creates an instance:

```typescript
container.factory(DbToken, (config) => new Database(config.apiUrl), {
  deps: [ConfigToken],
});
```

#### Class (bind)

Use `bind()` to pair a class directly with a token:

```typescript
container.bind(ServiceToken, UserService, { deps: [DbToken] });
```

#### Full register

Use `register()` for the full provider object — useful when the provider type matters:

```typescript
container.register(ServiceToken, { useClass: UserService, deps: [DbToken], lifetime: 'transient' });
```

### Lifetimes

| Lifetime              | Behaviour                                                |
| --------------------- | -------------------------------------------------------- |
| `singleton` (default) | One instance per container — created on first `get()`    |
| `transient`           | New instance on every `get()`                            |
| `scoped`              | One instance per child container; singletons in the root |

```typescript
container.factory(RequestId, () => crypto.randomUUID(), { lifetime: 'transient' });
container.bind(RequestHandler, RequestHandlerImpl, { deps: [RequestId], lifetime: 'scoped' });
```

### Child Containers and Hierarchy

Child containers inherit all registrations from their parent. Registrations in the child take precedence:

```typescript
const child = container.createChild();
child.value(RequestContext, { userId: 'u1' });

const handler = child.get(RequestHandler); // uses child context
```

### Scoped Execution

`runInScope()` creates a child container, passes it to your function, then disposes it automatically:

```typescript
await container.runInScope(async (scope) => {
  scope.value(RequestId, crypto.randomUUID());
  const handler = scope.get(RequestHandler);
  await handler.process(request);
});
```

### Async Resolution

Factories can return a `Promise<T>`. Use `getAsync()` (or `getAllAsync()`) to resolve them:

```typescript
container.factory(DbToken, async () => {
  const db = new Database(env.DB_URL);
  await db.connect();
  return db;
});

const db = await container.getAsync(DbToken);
```

### Aliases

Map one token to another — useful for interface-to-implementation bindings:

```typescript
const IUserServiceToken = createToken<IUserService>('IUserService');

container.bind(UserServiceToken, UserServiceImpl, { deps: [DbToken] });
container.alias(IUserServiceToken, UserServiceToken);

const svc = container.get(IUserServiceToken); // resolves to UserServiceImpl
```

### Batch Resolution

Resolve multiple tokens at once with a typed tuple result:

```typescript
const [db, config, logger] = container.getAll([DbToken, ConfigToken, LoggerToken]);
const [db, cache] = await container.getAllAsync([DbToken, CacheToken]);
```

### Dispose Hooks

Register a `dispose` callback on any class or factory provider:

```typescript
container.factory(DbToken, () => new Database(env.DB_URL), {
  dispose: (db) => db.close(),
});

await container.dispose(); // calls db.close() on the cached singleton
```

`dispose()` is idempotent — calling it multiple times is safe. The container also implements `[Symbol.asyncDispose]` for `await using` syntax.

### Testing

#### createTestContainer

`createTestContainer(base?)` returns `{ container, dispose }` — an isolated child container for test overrides and a cleanup function:

```typescript
import { createTestContainer, createToken } from '@vielzeug/wireit';

const { container, dispose } = createTestContainer(appContainer);
container.value(DbToken, mockDb, { overwrite: true });

afterEach(() => dispose());
```

#### container.mock

`mock()` temporarily replaces a token for the duration of a callback, then restores the original:

```typescript
const result = await container.mock(DbToken, fakeDb, () => service.loadUsers());

// Or with a full provider:
await container.mock(DbToken, { useFactory: () => createInMemoryDb() }, async () => {
  // ... test code
});
```

#### Snapshot / Restore

For lower-level test isolation:

```typescript
const snap = container.snapshot();
container.value(DbToken, fakeDb, { overwrite: true });
// ... test
container.restore(snap);
```

## API

**Package exports**

```ts
export {
  AliasCycleError,
  AsyncProviderError,
  CircularDependencyError,
  Container,
  ContainerDisposedError,
  createContainer,
  createTestContainer,
  createToken,
  ProviderNotFoundError,
} from '@vielzeug/wireit';

export type {
  ClassProvider,
  FactoryProvider,
  Lifetime,
  Provider,
  ProviderOptions,
  Snapshot,
  Token,
  TokenValues,
  ValueProvider,
} from '@vielzeug/wireit';
```

**Factory functions**

| Export                        | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `createToken<T>(description)` | Create a typed dependency injection token                                      |
| `createContainer()`           | Create a new root container                                                    |
| `createTestContainer(base?)`  | Returns `{ container, dispose }` — isolated child container for test overrides |

**Container registration**

| Method                             | Description                                |
| ---------------------------------- | ------------------------------------------ |
| `register(token, provider, opts?)` | Register a full `Provider<T>`              |
| `value(token, val, opts?)`         | Register a plain value                     |
| `factory(token, fn, opts?)`        | Register a factory function                |
| `bind(token, cls, opts?)`          | Bind a class to a token                    |
| `alias(token, source)`             | Map `token` to `source`                    |
| `unregister(token)`                | Remove a registration                      |
| `clear()`                          | Clear all registrations (no dispose hooks) |

**Container resolution**

| Method                       | Description                              |
| ---------------------------- | ---------------------------------------- |
| `get<T>(token)`              | Resolve synchronously — throws if async  |
| `getAsync<T>(token)`         | Resolve asynchronously                   |
| `getAll(tokens)`             | Resolve a tuple of tokens synchronously  |
| `getAllAsync(tokens)`        | Resolve a tuple of tokens asynchronously |
| `getOptional<T>(token)`      | Resolve or return `undefined`            |
| `getOptionalAsync<T>(token)` | Resolve async or return `undefined`      |
| `has(token)`                 | Check if a token is registered           |

**Container lifecycle**

| Method / Property       | Description                               |
| ----------------------- | ----------------------------------------- |
| `createChild()`         | Create a child container                  |
| `runInScope(fn)`        | Run `fn` in an auto-disposed child        |
| `dispose()`             | Run dispose hooks and clear registrations |
| `disposed`              | Whether the container has been disposed   |
| `[Symbol.asyncDispose]` | `await using` support                     |

**Container testing**

| Method                  | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `mock(token, mock, fn)` | Temporarily replace a token; restore after `fn`   |
| `snapshot()`            | Capture current registrations                     |
| `restore(snap)`         | Restore a previous snapshot                       |
| `debug()`               | List all tokens and aliases (including inherited) |

**Exported types**

| Type                       | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `Token<T>`                 | Typed injection token                                        |
| `Lifetime`                 | `'singleton' \| 'transient' \| 'scoped'`                     |
| `Provider<T>`              | Union of `ValueProvider`, `ClassProvider`, `FactoryProvider` |
| `ProviderOptions<T, Deps>` | Options for `factory()` and `bind()`                         |
| `TokenValues<T>`           | Extracts value types from a tuple of tokens                  |
| `Snapshot`                 | Opaque snapshot handle                                       |

**Exported errors**

| Error                     | Thrown when                                  |
| ------------------------- | -------------------------------------------- |
| `ProviderNotFoundError`   | No provider is registered for a token        |
| `CircularDependencyError` | A dependency graph cycle is detected         |
| `AsyncProviderError`      | An async provider is resolved with `get()`   |
| `AliasCycleError`         | Alias definitions form a cycle               |
| `ContainerDisposedError`  | Any method is called on a disposed container |

## Documentation

Full docs at **[vielzeug.dev/wireit](https://vielzeug.dev/wireit)**

|                                                  |                                         |
| ------------------------------------------------ | --------------------------------------- |
| [Usage Guide](https://vielzeug.dev/wireit/usage) | Registration, lifetimes, async, testing |
| [API Reference](https://vielzeug.dev/wireit/api) | Complete type signatures                |
| [Examples](https://vielzeug.dev/wireit/examples) | Real-world DI patterns                  |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
