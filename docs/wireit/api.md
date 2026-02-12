# Wireit API Reference

Complete API documentation for @vielzeug/wireit.

## Table of Contents

[[toc]]

## Factory Functions

### createToken()

Creates a typed token for dependency identification.

#### Signature

```ts
function createToken<T = unknown>(description?: string): Token<T>;
```

#### Parameters

- `description?: string` - Optional description for debugging

#### Returns

A typed symbol token

#### Example

```ts
const Logger = createToken<ILogger>('Logger');
const Config = createToken<AppConfig>('Config');
const Database = createToken<PrismaClient>('Database');

// Without description
const Cache = createToken<CacheService>();
```

---

### createContainer()

Creates a new dependency injection container.

#### Signature

```ts
function createContainer(options?: ContainerOptions): Container;
```

#### Parameters

- `options?: ContainerOptions` - Optional configuration

```ts
type ContainerOptions = {
  parent?: Container;
  allowOptional?: boolean;
};
```

#### Returns

A new Container instance

#### Example

```ts
// Basic container
const container = createContainer();

// Container with parent
const child = createContainer({ parent: rootContainer });

// Container that returns undefined for missing tokens
const optional = createContainer({ allowOptional: true });
```

---

### createTestContainer()

Creates a test container with automatic cleanup.

#### Signature

```ts
function createTestContainer(base?: Container): {
  container: Container;
  dispose: () => void;
};
```

#### Parameters

- `base?: Container` - Optional base container to inherit from

#### Returns

Object with container and dispose function

#### Example

```ts
import { createTestContainer } from '@vielzeug/wireit';

describe('UserService', () => {
  const { container, dispose } = createTestContainer();

  afterEach(() => dispose());

  it('should work', () => {
    container.registerValue(Token, value);
    // test...
  });
});
```

---

### withMock()

Temporarily mock a dependency for testing.

#### Signature

```ts
function withMock<T, R>(container: Container, token: Token<T>, mock: T, fn: () => Promise<R> | R): Promise<R>;
```

#### Parameters

- `container: Container` - The container to modify
- `token: Token<T>` - Token to mock
- `mock: T` - Mock value or implementation
- `fn: () => Promise<R> | R` - Function to execute with mock

#### Returns

Promise resolving to the function result

#### Example

```ts
const mockDb = { query: vi.fn() };

await withMock(container, Database, mockDb, async () => {
  const service = container.get(UserService);
  await service.getUser('123');
  expect(mockDb.query).toHaveBeenCalled();
});

// Original database is restored
```

## Container

### Registration Methods

#### register()

Register a provider for a token.

##### Signature

```ts
register<T>(token: Token<T>, provider: Provider<T>): this;
```

##### Parameters

- `token: Token<T>` - Token to register
- `provider: Provider<T>` - Provider configuration

```ts
type Provider<T> =
  | { useValue: T; lifetime?: Lifetime }
  | { useClass: new (...args: any[]) => T; deps?: Token<any>[]; lifetime?: Lifetime }
  | { useFactory: (...deps: any[]) => T | Promise<T>; deps?: Token<any>[]; lifetime?: Lifetime; async?: boolean };

type Lifetime = 'singleton' | 'transient' | 'scoped';
```

##### Returns

The container instance (for chaining)

##### Example

```ts
// Value provider
container.register(Config, { useValue: config });

// Class provider
container.register(UserService, {
  useClass: UserServiceImpl,
  deps: [Database, Logger],
  lifetime: 'singleton',
});

// Factory provider
container.register(Cache, {
  useFactory: (config) => new RedisCache(config.redisUrl),
  deps: [Config],
  lifetime: 'singleton',
});

// Async factory
container.register(Database, {
  useFactory: async (config) => {
    const db = new PrismaClient();
    await db.$connect();
    return db;
  },
  deps: [Config],
  async: true,
  lifetime: 'singleton',
});
```

#### registerValue()

Convenience method to register a value provider.

##### Signature

```ts
registerValue<T>(token: Token<T>, value: T, lifetime?: Lifetime): this;
```

##### Parameters

- `token: Token<T>` - Token to register
- `value: T` - Value to register
- `lifetime?: Lifetime` - Optional lifetime (default: `'singleton'`)

##### Example

```ts
container.registerValue(Config, { apiUrl: 'https://api.example.com' });
container.registerValue(RequestId, generateId(), 'transient');
```

#### registerFactory()

Convenience method to register a factory provider.

##### Signature

```ts
registerFactory<T>(
  token: Token<T>,
  factory: (...deps: any[]) => T | Promise<T>,
  deps?: Token<any>[],
  options?: { lifetime?: Lifetime; async?: boolean }
): this;
```

##### Parameters

- `token: Token<T>` - Token to register
- `factory: (...deps: any[]) => T | Promise<T>` - Factory function
- `deps?: Token<any>[]` - Dependencies to inject
- `options?: object` - Optional configuration
  - `lifetime?: Lifetime` - Lifetime (default: `'transient'`)
  - `async?: boolean` - Whether factory is async

##### Example

```ts
container.registerFactory(Logger, (config) => new ConsoleLogger(config.logLevel), [Config], { lifetime: 'singleton' });

container.registerFactory(
  Database,
  async (config) => {
    const db = new PrismaClient();
    await db.$connect();
    return db;
  },
  [Config],
  { async: true, lifetime: 'singleton' },
);
```

#### registerMany()

Register multiple providers at once.

##### Signature

```ts
registerMany(providers: Array<[Token<any>, Provider<any>]>): this;
```

##### Parameters

- `providers: Array<[Token<any>, Provider<any>]>` - Array of token/provider pairs

##### Example

```ts
container.registerMany([
  [Config, { useValue: config }],
  [Logger, { useClass: ConsoleLogger }],
  [Database, { useClass: PrismaDatabase, deps: [Config] }],
]);
```

### Resolution Methods

#### get()

Resolve a dependency synchronously.

##### Signature

```ts
get<T>(token: Token<T>): T;
```

##### Parameters

- `token: Token<T>` - Token to resolve

##### Returns

The resolved instance

##### Throws

- `ProviderNotFoundError` - Token not registered
- `AsyncProviderError` - Provider is async, use `getAsync()`
- `CircularDependencyError` - Circular dependency detected

##### Example

```ts
const logger = container.get(Logger);
const config = container.get(Config);
```

#### getAsync()

Resolve a dependency asynchronously.

##### Signature

```ts
getAsync<T>(token: Token<T>): Promise<T>;
```

##### Parameters

- `token: Token<T>` - Token to resolve

##### Returns

Promise resolving to the instance

##### Example

```ts
const db = await container.getAsync(Database);
const service = await container.getAsync(UserService);
```

#### getOptional()

Resolve a dependency, returning undefined if not found.

##### Signature

```ts
getOptional<T>(token: Token<T>): T | undefined;
```

##### Parameters

- `token: Token<T>` - Token to resolve

##### Returns

The instance or undefined

##### Example

```ts
const logger = container.getOptional(Logger);
if (logger) {
  logger.info('Logger available');
}
```

#### getOptionalAsync()

Async version of `getOptional()`.

##### Signature

```ts
getOptionalAsync<T>(token: Token<T>): Promise<T | undefined>;
```

##### Example

```ts
const cache = await container.getOptionalAsync(Cache);
if (cache) {
  await cache.set('key', 'value');
}
```

### Management Methods

#### has()

Check if a token is registered.

##### Signature

```ts
has(token: Token<any>): boolean;
```

##### Example

```ts
if (container.has(Logger)) {
  const logger = container.get(Logger);
}
```

#### alias()

Create an alias for a token.

##### Signature

```ts
alias<T>(source: Token<T>, alias: Token<T>): this;
```

##### Parameters

- `source: Token<T>` - Source token
- `alias: Token<T>` - Alias token

##### Example

```ts
const UserServiceImpl = createToken('UserServiceImpl');
const IUserService = createToken('IUserService');

container.register(UserServiceImpl, { useClass: UserService });
container.alias(UserServiceImpl, IUserService);

const service = container.get(IUserService); // Returns UserService instance
```

#### unregister()

Remove a registration.

##### Signature

```ts
unregister<T>(token: Token<T>): this;
```

##### Example

```ts
container.unregister(Logger);
console.log(container.has(Logger)); // false
```

#### clear()

Clear all registrations.

##### Signature

```ts
clear(): void;
```

##### Example

```ts
container.clear();
```

#### debug()

Get debug information about registrations.

##### Signature

```ts
debug(): { tokens: string[]; aliases: Array<[string, string]> };
```

##### Example

```ts
const debug = container.debug();
console.log(debug.tokens); // ['Config', 'Logger', 'Database']
console.log(debug.aliases); // [['ILogger', 'Logger']]
```

### Container Hierarchy

#### createChild()

Create a child container.

##### Signature

```ts
createChild(overrides?: Array<[Token<any>, Provider<any>]>): Container;
```

##### Parameters

- `overrides?: Array<[Token<any>, Provider<any>]>` - Optional initial registrations

##### Returns

New child container

##### Example

```ts
const child = container.createChild();

// With overrides
const child = container.createChild([
  [RequestId, { useValue: generateId() }],
  [User, { useValue: currentUser }],
]);
```

#### runInScope()

Run a function in a scoped container with automatic cleanup.

##### Signature

```ts
runInScope<T>(
  fn: (scope: Container) => Promise<T> | T,
  overrides?: Array<[Token<any>, Provider<any>]>
): Promise<T>;
```

##### Parameters

- `fn: (scope: Container) => Promise<T> | T` - Function to execute
- `overrides?: Array<[Token<any>, Provider<any>]>` - Optional initial registrations

##### Returns

Promise resolving to the function result

##### Example

```ts
await container.runInScope(
  async (scope) => {
    const handler = scope.get(RequestHandler);
    return await handler.process(data);
  },
  [[RequestId, { useValue: generateId() }]],
);
// Scope is automatically cleaned up
```

## Testing Utilities

### createTestContainer()

See [Factory Functions](#createtestcontainer)

### withMock()

See [Factory Functions](#withmock)

## Types

### Token

```ts
type Token<T = unknown> = symbol & { __type?: T };
```

Opaque type representing a typed dependency token.

### Lifetime

```ts
type Lifetime = 'singleton' | 'transient' | 'scoped';
```

Defines when and how often instances are created:

- `singleton` - Created once, shared globally
- `transient` - Created every time
- `scoped` - Created once per scope

### Provider

```ts
type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

type ValueProvider<T> = {
  useValue: T;
  lifetime?: Lifetime;
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
  async?: boolean;
};
```

### ContainerOptions

```ts
type ContainerOptions = {
  parent?: Container;
  allowOptional?: boolean;
};
```

Options for creating a container:

- `parent` - Parent container for hierarchical DI
- `allowOptional` - Return undefined for missing tokens instead of throwing

## Errors

### ProviderNotFoundError

Thrown when attempting to resolve a token that hasn't been registered.

```ts
class ProviderNotFoundError extends Error {
  constructor(token: Token<any>);
}
```

**Example:**

```ts
try {
  const service = container.get(UnknownToken);
} catch (error) {
  if (error instanceof ProviderNotFoundError) {
    console.error('Provider not found:', error.message);
  }
}
```

### AsyncProviderError

Thrown when using `get()` with an async provider.

```ts
class AsyncProviderError extends Error {
  constructor(token: Token<any>);
}
```

**Example:**

```ts
container.registerFactory(DB, async () => db, [], { async: true });

try {
  const db = container.get(DB); // Error!
} catch (error) {
  if (error instanceof AsyncProviderError) {
    const db = await container.getAsync(DB); // Correct
  }
}
```

### CircularDependencyError

Thrown when a circular dependency is detected.

```ts
class CircularDependencyError extends Error {
  constructor(path: Token<any>[]);
}
```

**Example:**

```ts
container.register(ServiceA, { useClass: A, deps: [ServiceB] });
container.register(ServiceB, { useClass: B, deps: [ServiceA] });

try {
  const a = container.get(ServiceA);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.error('Circular dependency detected:', error.message);
    // Circular dependency detected: ServiceA → ServiceB → ServiceA
  }
}
```

## Best Practices

### Token Organization

```ts
// tokens.ts - Centralize token definitions
export const Config = createToken<AppConfig>('Config');
export const Logger = createToken<ILogger>('Logger');
export const Database = createToken<PrismaClient>('Database');
export const UserService = createToken<IUserService>('UserService');
```

### Type Safety

```ts
// ✅ Use interfaces for flexibility
interface ILogger {
  info(message: string): void;
  error(message: string): void;
}

const Logger = createToken<ILogger>('Logger');

// ❌ Avoid concrete types
const Logger = createToken<ConsoleLogger>('Logger');
```

### Lifetime Selection

```ts
// ✅ Singleton for expensive resources
container.register(Database, {
  useClass: PrismaDatabase,
  lifetime: 'singleton',
});

// ✅ Transient for lightweight objects
container.registerFactory(RequestId, () => generateId(), [], {
  lifetime: 'transient',
});

// ✅ Scoped for request-specific data
container.register(RequestContext, {
  useClass: Context,
  lifetime: 'scoped',
});
```

### Error Handling

```ts
// ✅ Use optional resolution when appropriate
const logger = container.getOptional(Logger);
if (logger) {
  logger.info('Starting...');
}

// ✅ Handle specific errors
try {
  const service = container.get(Service);
} catch (error) {
  if (error instanceof ProviderNotFoundError) {
    // Handle missing provider
  } else if (error instanceof CircularDependencyError) {
    // Handle circular dependency
  }
}
```
