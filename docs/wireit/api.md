---
title: Wireit — API Reference
description: Complete API reference for the Wireit dependency injection container.
---

# Wireit API Reference

[[toc]]

## Factory Functions

### createToken()

Creates a typed token used to identify a dependency in the container.

#### Signature

```ts
function createToken<T = unknown>(description: string): Token<T>;
```

#### Parameters

- `description: string` – Human-readable name shown in error messages and `debug()` output.

#### Returns

A typed token (`symbol & { __type?: T }`).

#### Example

```ts
const Logger   = createToken<ILogger>('Logger');
const Config   = createToken<AppConfig>('Config');
const Database = createToken<IDatabase>('Database');
```

---

### createContainer()

Creates a new root dependency injection container.

#### Signature

```ts
function createContainer(): Container;
```

#### Returns

A new empty `Container` instance.

#### Example

```ts
const container = createContainer();
```

---

### createTestContainer()

Creates a child test container with an automatic cleanup helper.

#### Signature

```ts
function createTestContainer(base?: Container): {
  container: Container;
  dispose: () => void;
};
```

#### Parameters

- `base?: Container` – Optional parent container. When provided the new container inherits all of its registrations. When omitted a fresh root container is used as parent.

#### Returns

- `container` – A child `Container` instance.
- `dispose()` – Calls `container.clear()`. Call this in `afterEach` to prevent state leaking between tests.

#### Example

```ts
describe('UserService', () => {
  const { container, dispose } = createTestContainer(appContainer);

  afterEach(() => dispose());

  it('resolves with mock db', () => {
    container.registerValue(DbToken, mockDb);
    const svc = container.get(UserServiceToken);
    // ...
  });
});
```

---

### withMock()

Temporarily overrides a token registration for the duration of a callback, then restores the original state.

Internally uses `snapshot()` / `restore()`.

#### Signature

```ts
function withMock<T, R>(
  container: Container,
  token: Token<T>,
  mock: T,
  fn: () => Promise<R> | R,
): Promise<R>;
```

#### Parameters

- `container: Container` – Container to modify.
- `token: Token<T>` – Token to override.
- `mock: T` – Mock value to register for the duration of `fn`.
- `fn: () => Promise<R> | R` – Callback to execute; may be async.

#### Returns

`Promise<R>` — resolves to the value returned by `fn`. The original registration is restored even if `fn` throws.

#### Example

```ts
const mockDb = { query: vi.fn() };

const result = await withMock(container, DbToken, mockDb, async () => {
  const svc = container.get(UserServiceToken);
  return svc.getUser('1');
});

// DbToken is restored here; mockDb.query holds recorded calls
```

---

## Container

### Registration Methods

All registration methods return `this`, enabling chaining.

#### register()

Register a provider for a token.

##### Signature

```ts
register<T>(token: Token<T>, provider: Provider<T>): this;
```

##### Parameters

- `token: Token<T>` – Token to register.
- `provider: Provider<T>` – One of:

```ts
type Provider<T> =
  | { useValue: T }
  | { useClass: new (...args: any[]) => T; deps?: Token<any>[]; lifetime?: Lifetime }
  | { useFactory: (...deps: any[]) => T | Promise<T>; deps?: Token<any>[]; lifetime?: Lifetime };

type Lifetime = 'singleton' | 'transient' | 'scoped';
```

`useClass` and `useFactory` default to `'singleton'` when `lifetime` is omitted.

##### Example

```ts
// Value provider
container.register(ConfigToken, { useValue: { port: 3000 } });

// Class provider — container instantiates and caches
container.register(UserServiceToken, {
  useClass: UserService,
  deps: [DbToken, LoggerToken],
  lifetime: 'singleton',
});

// Sync factory
container.register(LoggerToken, {
  useFactory: (config) => new ConsoleLogger(config.level),
  deps: [ConfigToken],
});

// Async factory — must resolve via getAsync()
container.register(DbToken, {
  useFactory: async (config) => {
    const db = new PrismaClient({ datasourceUrl: config.dbUrl });
    await db.$connect();
    return db;
  },
  deps: [ConfigToken],
  lifetime: 'singleton',
});
```

---

#### registerValue()

Shorthand for `register(token, { useValue: value })`.

##### Signature

```ts
registerValue<T>(token: Token<T>, value: T): this;
```

##### Example

```ts
container.registerValue(ConfigToken, { port: 3000, dbUrl: '...' });
container.registerValue(LoggerToken, new ConsoleLogger());
```

---

#### alias()

Redirect resolution of `token` to `source`. When the container receives a `get(token)` call it resolves `source` instead.

Alias chains are supported (`C → B → A`). Cycle detection throws a generic `Error`.

##### Signature

```ts
alias<T>(token: Token<T>, source: Token<T>): this;
```

##### Parameters

- `token: Token<T>` – The new alias token.
- `source: Token<T>` – The existing token to redirect to.

##### Example

```ts
const ILogger     = createToken<ILogger>('ILogger');
const LoggerImpl  = createToken<ConsoleLogger>('LoggerImpl');

container.register(LoggerImpl, { useClass: ConsoleLogger });
container.alias(ILogger, LoggerImpl);

container.get(ILogger); // returns ConsoleLogger instance
```

---

#### unregister()

Remove a registration from the container.

##### Signature

```ts
unregister<T>(token: Token<T>): this;
```

##### Example

```ts
container.unregister(LoggerToken);
container.has(LoggerToken); // false
```

---

#### clear()

Remove all registrations and aliases. Cached singleton instances are also dropped.

##### Signature

```ts
clear(): this;
```

##### Example

```ts
container.clear();
```

---

### Resolution Methods

#### get()

Resolve a dependency synchronously.

##### Signature

```ts
get<T>(token: Token<T>): T;
```

##### Throws

- `ProviderNotFoundError` — token is not registered in this container or any parent.
- `AsyncProviderError` — the provider's factory is `async`; use `getAsync()` instead.
- `CircularDependencyError` — circular dependency detected during resolution.

##### Example

```ts
const logger = container.get(LoggerToken);
const config = container.get(ConfigToken);
```

---

#### getAsync()

Resolve a dependency asynchronously. Works for both sync and async providers. Concurrent singleton requests share the same in-flight `Promise` to avoid duplicate instantiation.

##### Signature

```ts
getAsync<T>(token: Token<T>): Promise<T>;
```

##### Example

```ts
const db = await container.getAsync(DbToken);
```

---

#### getOptional()

Resolve a dependency synchronously, returning `undefined` if the token is not registered. Re-throws any other error (including `AsyncProviderError` and `CircularDependencyError`).

##### Signature

```ts
getOptional<T>(token: Token<T>): T | undefined;
```

##### Example

```ts
const cache = container.getOptional(CacheToken);
if (cache) {
  await cache.set('key', value);
}
```

---

#### getOptionalAsync()

Async version of `getOptional()`.

##### Signature

```ts
getOptionalAsync<T>(token: Token<T>): Promise<T | undefined>;
```

##### Example

```ts
const cache = await container.getOptionalAsync(CacheToken);
```

---

#### has()

Check whether a token is registered in this container or any ancestor.

##### Signature

```ts
has(token: Token<any>): boolean;
```

##### Example

```ts
if (container.has(LoggerToken)) {
  container.get(LoggerToken).info('ready');
}
```

---

### Container Hierarchy

#### createChild()

Create a child container that inherits all registrations from this container. Child registrations shadow the parent locally; the parent is never modified.

`'scoped'` providers receive their own cached instance per child container.

##### Signature

```ts
createChild(): Container;
```

##### Example

```ts
const child = container.createChild();
child.registerValue(RequestIdToken, generateId());

child.get(LoggerToken);    // inherited from parent
child.get(RequestIdToken); // local to this child
```

---

#### runInScope()

Create a temporary child container, pass it to `fn`, then `clear()` the child in a `finally` block.

##### Signature

```ts
runInScope<T>(fn: (scope: Container) => Promise<T> | T): Promise<T>;
```

##### Parameters

- `fn` – Receives the scoped child container. May be sync or async.

##### Returns

`Promise<T>` — resolves to the value returned by `fn`.

##### Example

```ts
const result = await container.runInScope(async (scope) => {
  scope.registerValue(RequestIdToken, generateId());
  scope.registerValue(UserToken, currentUser);
  return scope.get(RequestHandlerToken).handle(data);
});
// scope is cleared here regardless of success or failure
```

---

### Snapshot / Restore

#### snapshot()

Take a deep copy of the container's current registry and alias map, including any cached singleton instances.

##### Signature

```ts
snapshot(): Snapshot;
```

##### Returns

An opaque `Snapshot` handle.

---

#### restore()

Restore the container to a previously snapshotted state.

##### Signature

```ts
restore(snap: Snapshot): this;
```

##### Example

```ts
const snap = container.snapshot();

container.registerValue(LoggerToken, mockLogger);
container.get(UserServiceToken).doWork();

container.restore(snap); // original LoggerToken is back
```

---

### Debug

#### debug()

Return a plain-object summary of all registered tokens and aliases, for logging or inspection.

##### Signature

```ts
debug(): { tokens: string[]; aliases: Array<[string, string]> };
```

##### Returns

- `tokens` — description strings of all directly registered tokens.
- `aliases` — pairs of `[aliasDescription, sourceDescription]`.

##### Example

```ts
container.register(DbToken, { useClass: PrismaDb });
container.register(LoggerToken, { useClass: ConsoleLogger });
container.alias(ILoggerToken, LoggerToken);

console.log(container.debug());
// { tokens: ['Database', 'Logger'], aliases: [['ILogger', 'Logger']] }
```

---

## Types

### Token

```ts
type Token<T = unknown> = symbol & { __type?: T };
```

Opaque typed symbol. The `__type` phantom property is never present at runtime — it exists only for TypeScript inference.

---

### Lifetime

```ts
type Lifetime = 'singleton' | 'transient' | 'scoped';
```

| Value | Behaviour |
|---|---|
| `'singleton'` | One instance per container, cached after first resolution. Default for `useClass` and `useFactory`. |
| `'transient'` | New instance on every `get()` / `getAsync()` call. |
| `'scoped'` | One instance per child container. Acts as singleton in the root container. |

---

### Provider

```ts
type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

type ValueProvider<T> = {
  useValue: T;
};

type ClassProvider<T> = {
  useClass: new (...args: any[]) => T;
  deps?: Token<any>[];
  lifetime?: Lifetime;
};

type FactoryProvider<T> = {
  useFactory: (...deps: any[]) => T | Promise<T>;
  deps?: Token<any>[];
  lifetime?: Lifetime;
};
```

---

### Snapshot

```ts
type Snapshot = { readonly __snapshot: never };
```

Opaque handle returned by `snapshot()`. Pass it to `restore()` to roll back.

---

## Errors

### ProviderNotFoundError

Thrown when resolving a token that has not been registered in the container or any of its ancestors.

```ts
class ProviderNotFoundError extends Error {}
```

**Example:**

```ts
try {
  container.get(UnregisteredToken);
} catch (error) {
  if (error instanceof ProviderNotFoundError) {
    console.error(error.message); // "No provider registered for token: UnregisteredToken"
  }
}
```

---

### AsyncProviderError

Thrown when `get()` is called on a token whose factory is async. Use `getAsync()` instead.

```ts
class AsyncProviderError extends Error {}
```

**Example:**

```ts
container.register(DbToken, { useFactory: async () => connectDb() });

try {
  container.get(DbToken); // throws
} catch (error) {
  if (error instanceof AsyncProviderError) {
    const db = await container.getAsync(DbToken); // correct
  }
}
```

---

### CircularDependencyError

Thrown when a circular dependency is detected during resolution.

```ts
class CircularDependencyError extends Error {}
```

**Example:**

```ts
container.register(ServiceAToken, { useClass: ServiceA, deps: [ServiceBToken] });
container.register(ServiceBToken, { useClass: ServiceB, deps: [ServiceAToken] });

try {
  container.get(ServiceAToken);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.error(error.message);
    // "Circular dependency detected: ServiceA → ServiceB → ServiceA"
  }
}
```
