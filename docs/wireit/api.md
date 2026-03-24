---
title: Wireit — API Reference
description: Complete API reference for @vielzeug/wireit dependency injection container.
---

# Wireit API Reference

[[toc]]

## API At a Glance

| Symbol                       | Purpose                             | Execution mode | Common gotcha                                               |
| ---------------------------- | ----------------------------------- | -------------- | ----------------------------------------------------------- |
| `createContainer()`          | Create a typed dependency container | Sync           | Avoid duplicate token registration without overwrite intent |
| `container.get()/getAsync()` | Resolve sync/async providers        | Mixed          | Use getAsync for async factories                            |
| `createTestContainer()`      | Create isolated test containers     | Sync           | Dispose test container after each test                      |

## Package Exports

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

## `createToken(description)`

Creates a typed injection token.

**Parameters:**

- `description: string` — Human-readable name shown in error messages and `debug()` output. Required.

**Returns:** `Token<T>`

**Example:**

```ts
import { createToken } from '@vielzeug/wireit';

const DbToken = createToken<IDatabase>('Database');
const ConfigToken = createToken<AppConfig>('AppConfig');
```

## `createContainer()`

Creates a new root container.

**Returns:** `Container`

**Example:**

```ts
import { createContainer } from '@vielzeug/wireit';

const container = createContainer();
```

## `createTestContainer(base?)`

Creates an isolated child container for unit tests. Returns `{ container, dispose }` where `container` is the child container for registering test overrides, and `dispose()` tears it down without affecting the base container.

**Parameters:**

- `base?: Container` — Optional base container to inherit from. When omitted, a new root container is used.

**Returns:** `{ container: Container; dispose: () => Promise<void> }`

**Example:**

```ts
import { createTestContainer } from '@vielzeug/wireit';

const { container, dispose } = createTestContainer(appContainer);
container.value(DbToken, mockDb, { overwrite: true });

afterEach(() => dispose());
```

## Container Registration

### `register(token, provider, opts?)`

Register a full `Provider<T>` for a token.

**Parameters:**

- `token: Token<T>` — The injection token
- `provider: Provider<T>` — One of `ValueProvider<T>`, `ClassProvider<T>`, or `FactoryProvider<T>`
- `opts?: { overwrite?: boolean }` — Pass `{ overwrite: true }` to replace an existing registration

**Returns:** `this` (chainable)

**Throws:** `Error` if the token is already registered and `overwrite` is not `true`

**Example:**

```ts
container.register(DbToken, { useClass: Database, deps: [ConfigToken] });
container.register(ConfigToken, { useValue: { apiUrl: 'https://...' } });
container.register(LogToken, { useFactory: () => new Logger() });
```

---

### `value(token, val, opts?)`

Shorthand for registering a plain value (wraps it in `{ useValue: val }`).

**Parameters:**

- `token: Token<T>` — The injection token
- `val: T` — The value to register
- `opts?: { overwrite?: boolean }`

**Returns:** `this` (chainable)

**Example:**

```ts
container.value(ConfigToken, { apiUrl: 'https://api.example.com' });
```

---

### `factory(token, fn, opts?)`

Shorthand for registering a factory function.

**Parameters:**

- `token: Token<T>` — The injection token
- `fn: (...deps: Deps) => T | Promise<T>` — Factory function
- `opts?: ProviderOptions<T, Deps>` — Optional lifetime, deps, dispose, and overwrite

**Returns:** `this` (chainable)

**Example:**

```ts
container.factory(DbToken, (config) => new Database(config.apiUrl), {
  deps: [ConfigToken],
  lifetime: 'singleton',
  dispose: (db) => db.close(),
});
```

---

### `bind(token, cls, opts?)`

Shorthand for binding a class constructor to a token.

**Parameters:**

- `token: Token<T>` — The injection token
- `cls: new (...args: Deps) => T` — The class to instantiate
- `opts?: ProviderOptions<T, Deps>` — Optional lifetime, deps, dispose, and overwrite

**Returns:** `this` (chainable)

**Example:**

```ts
container.bind(ServiceToken, UserService, {
  deps: [DbToken, LoggerToken],
  lifetime: 'singleton',
});
```

---

### `alias(token, source)`

Map `token` to `source` — resolving `token` will resolve `source` instead.

**Parameters:**

- `token: Token<T>` — The alias token
- `source: Token<T>` — The target token

**Returns:** `this` (chainable)

`AliasCycleError` is raised when resolving a token whose alias chain forms a cycle (for example via `get()`, `getAsync()`, or `has()`).

**Example:**

```ts
container.bind(ConsoleLoggerToken, ConsoleLogger);
container.alias(ILoggerToken, ConsoleLoggerToken);
```

---

### `unregister(token)`

Remove a token's registration from this container.

**Parameters:**

- `token: Token<any>`

**Returns:** `this` (chainable)

---

### `clear()`

Remove all registrations and aliases from this container without calling dispose hooks.

**Returns:** `this` (chainable)

## Container Resolution

### `get<T>(token)`

Resolve a token synchronously.

**Parameters:**

- `token: Token<T>`

**Returns:** `T`

**Throws:**

- `ProviderNotFoundError` — No provider registered
- `CircularDependencyError` — Circular dependency detected
- `AsyncProviderError` — Provider is async; use `getAsync()` instead
- `ContainerDisposedError` — Container has been disposed

---

### `getAsync<T>(token)`

Resolve a token asynchronously. Handles both sync and async providers.

**Parameters:**

- `token: Token<T>`

**Returns:** `Promise<T>`

**Throws:**

- `ProviderNotFoundError`
- `CircularDependencyError`
- `ContainerDisposedError`

---

### `getAll(tokens)`

Resolve a tuple of tokens synchronously, returning a typed tuple.

**Parameters:**

- `tokens: [...T]` — A tuple of `Token<any>` values

**Returns:** `TokenValues<T>` — A tuple matching the token types

**Example:**

```ts
const [db, config] = container.getAll([DbToken, ConfigToken]);
//     ^IDatabase  ^AppConfig
```

---

### `getAllAsync(tokens)`

Resolve a tuple of tokens asynchronously.

**Parameters:**

- `tokens: [...T]`

**Returns:** `Promise<TokenValues<T>>`

**Example:**

```ts
const [db, cache] = await container.getAllAsync([DbToken, CacheToken]);
```

---

### `getOptional<T>(token)`

Resolve a token, returning `undefined` if not registered.

**Parameters:**

- `token: Token<T>`

**Returns:** `T | undefined`

---

### `getOptionalAsync<T>(token)`

Resolve a token asynchronously, returning `undefined` if not registered.

**Parameters:**

- `token: Token<T>`

**Returns:** `Promise<T | undefined>`

---

### `has(token)`

Check if a token is registered (including parent containers).

**Parameters:**

- `token: Token<any>`

**Returns:** `boolean`

## Container Hierarchy

### `createChild()`

Create a child container that inherits all registrations from this container. `scoped` providers will create one instance per child container.

**Returns:** `Container`

**Throws:** `ContainerDisposedError` if this container has been disposed

---

### `runInScope(fn)`

Create a child container, pass it to `fn`, then call `dispose()` on it automatically when `fn` completes (or throws).

**Parameters:**

- `fn: (scope: Container) => Promise<T> | T`

**Returns:** `Promise<Awaited<T>>`

**Example:**

```ts
const result = await container.runInScope(async (scope) => {
  scope.value(UserToken, currentUser);
  return scope.get(ServiceToken).doWork();
});
```

## Container Lifecycle

### `dispose()`

Calls `dispose` hooks for all resolved singleton and scoped instances, then clears all registrations. Idempotent — calling multiple times is safe.

**Returns:** `Promise<void>`

---

### `disposed`

`true` after `dispose()` has been called.

**Type:** `boolean` (read-only)

---

### `[Symbol.asyncDispose]()`

Implements the `AsyncDisposable` protocol for `await using` syntax.

## Container Testing

### `mock(token, mock, fn)`

Temporarily replace a token's registration with `mock`, run `fn`, then restore the original state — even if `fn` throws.

**Parameters:**

- `token: Token<T>` — The token to replace
- `mock: T | Provider<T>` — A plain value (wrapped in `{ useValue }`) or a full provider
- `fn: () => Promise<R> | R` — Callback to run with the mock active

**Returns:** `Promise<R>`

**Example:**

```ts
const result = await container.mock(DbToken, fakeDb, () => svc.getUsers());
```

---

### `snapshot()`

Capture the current registrations and aliases (including cached instances).

**Returns:** `Snapshot` (opaque handle)

---

### `restore(snap)`

Restore registrations from a previous snapshot.

**Parameters:**

- `snap: Snapshot`

**Returns:** `this` (chainable)

---

### `debug()`

Return a human-readable view of all tokens and aliases, walking the full parent chain (child-wins).

**Returns:** `{ tokens: string[]; aliases: Array<[string, string]> }`

**Example:**

```ts
const { tokens, aliases } = container.debug();
// tokens:  ['AppConfig', 'Database', 'Logger', 'UserService']
// aliases: [['ILogger', 'Logger']]
```

## Types

### `Token<T>`

Typed injection token — a branded symbol.

```ts
type Token<T = unknown> = symbol & { __type?: T };
```

---

### `Lifetime`

```ts
type Lifetime = 'singleton' | 'transient' | 'scoped';
```

---

### `ValueProvider<T>`

```ts
type ValueProvider<T> = { useValue: T };
```

---

### `ClassProvider<T, Deps>`

```ts
type ClassProvider<T, Deps extends unknown[] = any[]> = {
  useClass: new (...args: Deps) => T;
  deps?: { [K in keyof Deps]: Token<Deps[K]> };
  lifetime?: Lifetime;
  dispose?: (instance: T) => void | Promise<void>;
};
```

---

### `FactoryProvider<T, Deps>`

```ts
type FactoryProvider<T, Deps extends unknown[] = any[]> = {
  useFactory: (...deps: Deps) => T | Promise<T>;
  deps?: { [K in keyof Deps]: Token<Deps[K]> };
  lifetime?: Lifetime;
  dispose?: (instance: T) => void | Promise<void>;
};
```

---

### `Provider<T>`

```ts
type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;
```

---

### `ProviderOptions<T, Deps>`

Options accepted by `factory()` and `bind()`. Can be imported to build higher-order helpers:

```ts
type ProviderOptions<T, Deps extends unknown[] = any[]> = {
  deps?: { [K in keyof Deps]: Token<Deps[K]> };
  lifetime?: Lifetime;
  dispose?: (instance: T) => void | Promise<void>;
  overwrite?: boolean;
};
```

---

### `TokenValues<T>`

Extracts the value types from a tuple of tokens, preserving position:

```ts
type TokenValues<T extends readonly Token<any>[]> = {
  [K in keyof T]: T[K] extends Token<infer V> ? V : never;
};

// Usage
const tokens = [DbToken, ConfigToken] as const;
type Values = TokenValues<typeof tokens>; // [IDatabase, AppConfig]
```

---

### `Snapshot`

Opaque handle returned by `snapshot()` and accepted by `restore()`.

```ts
type Snapshot = { readonly __snapshot: never };
```

## Errors

### `ProviderNotFoundError`

Thrown when `get()` or `getAsync()` is called for an unregistered token.

```
No provider registered for token: Database
```

---

### `CircularDependencyError`

Thrown when a circular dependency is detected. The full path is included:

```
Circular dependency detected: A → B → C → A
```

---

### `AsyncProviderError`

Thrown when `get()` (sync) is called on a token whose factory returns a `Promise`. Use `getAsync()` instead.

```
Provider for token "Database" is async. Use getAsync() instead.
```

---

### `AliasCycleError`

Thrown when alias definitions form a cycle. The full cycle path is shown:

```
Alias cycle detected: ILogger → Logger → ILogger
```

---

### `ContainerDisposedError`

Thrown when any public method is called on a container that has already been disposed.

```
Cannot use a disposed container.
```
