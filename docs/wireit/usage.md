# Wireit Usage Guide

Complete guide to installing and using Wireit in your projects.

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

[[toc]]

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/wireit
```

```sh [npm]
npm install @vielzeug/wireit
```

```sh [yarn]
yarn add @vielzeug/wireit
```

:::

## Import

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// Optional: Import types
import type { Container, Token, Provider, Lifetime, ContainerOptions } from '@vielzeug/wireit';
```

## Basic Usage

### Creating a Container

```ts
import { createContainer } from '@vielzeug/wireit';

const container = createContainer();

// With options
const container = createContainer({
  parent: parentContainer,
  allowOptional: true,
});
```

### Basic Registration and Resolution

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// 1. Create tokens
const Logger = createToken<ILogger>('Logger');

// 2. Register provider
container.registerValue(Logger, new ConsoleLogger());

// 3. Resolve dependency
const logger = container.get(Logger);
logger.info('Hello, Wireit!');
```

## Tokens

Tokens are typed symbols that uniquely identify dependencies in the container.

### Creating Tokens

```ts
// Basic token
const Logger = createToken<ILogger>('Logger');

// Token with complex type
const Config = createToken<{
  apiUrl: string;
  timeout: number;
}>('Config');

// Token without description (anonymous)
const Cache = createToken<CacheService>();
```

### Token Best Practices

```ts
// ✅ Use descriptive names
const UserRepository = createToken<IUserRepository>('UserRepository');

// ✅ Use interfaces for flexibility
interface ILogger {
  info(message: string): void;
  error(message: string): void;
}
const Logger = createToken<ILogger>('Logger');

// ❌ Avoid generic names
const Service = createToken<any>('Service');

// ❌ Avoid coupling to implementation
const PrismaDatabase = createToken<PrismaClient>('Database');
// ✅ Better: use interface
const Database = createToken<IDatabase>('Database');
```

## Providers

Wireit supports three types of providers for different scenarios.

### Value Provider

Register an existing instance or plain value:

```ts
// Plain object
const config = { apiUrl: 'https://api.example.com', timeout: 5000 };
container.registerValue(Config, config);

// Existing instance
const logger = new ConsoleLogger();
container.registerValue(Logger, logger);

// With custom lifetime
container.registerValue(RequestId, generateId(), 'transient');
```

### Class Provider

Register a class to be instantiated by the container:

```ts
class UserService {
  constructor(
    private database: IDatabase,
    private logger: ILogger,
  ) {}

  async createUser(data: UserData) {
    this.logger.info('Creating user');
    return this.database.users.create(data);
  }
}

container.register(UserService, {
  useClass: UserService,
  deps: [Database, Logger],
  lifetime: 'singleton', // default
});
```

### Factory Provider

Register a factory function for custom creation logic:

```ts
// Simple factory
container.registerFactory(Logger, () => new ConsoleLogger(), [], { lifetime: 'singleton' });

// Factory with dependencies
container.registerFactory(Database, (config) => new PrismaClient({ url: config.dbUrl }), [Config], {
  lifetime: 'singleton',
});

// Async factory
container.registerFactory(
  Database,
  async (config) => {
    const db = new PrismaClient({ url: config.dbUrl });
    await db.$connect();
    return db;
  },
  [Config],
  { async: true, lifetime: 'singleton' },
);
```

### Batch Registration

Register multiple providers at once:

```ts
container.registerMany([
  [Config, { useValue: appConfig }],
  [Logger, { useClass: ConsoleLogger }],
  [Database, { useClass: PrismaDatabase, deps: [Config, Logger] }],
  [UserRepo, { useClass: UserRepository, deps: [Database] }],
]);
```

## Lifetimes

Control when and how often instances are created.

### Singleton

Created once and reused across all resolutions (default for classes):

```ts
let instanceCount = 0;

class Database {
  constructor() {
    instanceCount++;
  }
}

container.register(Database, {
  useClass: Database,
  lifetime: 'singleton',
});

const db1 = container.get(Database);
const db2 = container.get(Database);

console.log(instanceCount); // 1
console.log(db1 === db2); // true
```

### Transient

New instance created for every resolution (default for factories):

```ts
let instanceCount = 0;

container.registerFactory(
  RequestId,
  () => {
    instanceCount++;
    return generateId();
  },
  [],
  { lifetime: 'transient' },
);

const id1 = container.get(RequestId);
const id2 = container.get(RequestId);

console.log(instanceCount); // 2
console.log(id1 === id2); // false
```

### Scoped

Created once per scope (useful for request-scoped dependencies):

```ts
container.register(RequestContext, {
  useClass: Context,
  lifetime: 'scoped',
});

// In root container, acts like singleton
const ctx1 = container.get(RequestContext);
const ctx2 = container.get(RequestContext);
console.log(ctx1 === ctx2); // true

// In child container, new instance per child
const child1 = container.createChild();
const child2 = container.createChild();

const ctx3 = child1.get(RequestContext);
const ctx4 = child2.get(RequestContext);
console.log(ctx3 === ctx4); // false
```

## Container Management

### Checking Registration

```ts
const Logger = createToken<ILogger>('Logger');

console.log(container.has(Logger)); // false

container.registerValue(Logger, new ConsoleLogger());

console.log(container.has(Logger)); // true
```

### Unregistering

```ts
container.register(Logger, { useClass: ConsoleLogger });
container.unregister(Logger);

console.log(container.has(Logger)); // false
```

### Clearing Container

```ts
container.registerValue(Config, config);
container.registerValue(Logger, logger);

container.clear(); // Removes all registrations

console.log(container.has(Config)); // false
console.log(container.has(Logger)); // false
```

### Debug Information

```ts
container.registerValue(Config, config);
container.register(Logger, { useClass: ConsoleLogger });
container.alias(Logger, ILogger);

const debug = container.debug();
console.log(debug);
// {
//   tokens: ['Config', 'Logger'],
//   aliases: [['ILogger', 'Logger']]
// }
```

## Advanced Features

### Async Resolution

For providers with async initialization:

```ts
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

// Must use getAsync
const db = await container.getAsync(Database);

// ❌ This will throw AsyncProviderError
// const db = container.get(Database);
```

### Optional Resolution

Handle missing dependencies gracefully:

```ts
// Returns undefined if not registered
const logger = container.getOptional(Logger);
if (logger) {
  logger.info('Logger is available');
}

// Async version
const db = await container.getOptionalAsync(Database);
```

### Allow Optional Mode

Configure container to return undefined for missing tokens:

```ts
const container = createContainer({ allowOptional: true });

const missing = container.get(UnknownToken); // undefined instead of error
```

### Token Aliasing

Create multiple names for the same provider:

```ts
const LoggerImpl = createToken<ConsoleLogger>('ConsoleLogger');
const ILogger = createToken<ILogger>('ILogger');

container.register(LoggerImpl, { useClass: ConsoleLogger });
container.alias(LoggerImpl, ILogger);

const logger1 = container.get(LoggerImpl);
const logger2 = container.get(ILogger);

console.log(logger1 === logger2); // true
```

### Chained Aliases

```ts
const Token1 = createToken('Token1');
const Token2 = createToken('Token2');
const Token3 = createToken('Token3');

container.registerValue(Token1, 'value');
container.alias(Token1, Token2);
container.alias(Token2, Token3);

console.log(container.get(Token3)); // 'value'
```

### Parent/Child Containers

Create hierarchical container structures:

```ts
const parent = createContainer();
parent.registerValue(Config, globalConfig);
parent.register(Logger, { useClass: ConsoleLogger });

// Child inherits from parent
const child = parent.createChild();

console.log(child.get(Config)); // globalConfig
console.log(child.get(Logger)); // ConsoleLogger instance

// Child can override parent
child.registerValue(Config, childConfig);

console.log(parent.get(Config)); // globalConfig (unchanged)
console.log(child.get(Config)); // childConfig
```

### Create Child with Overrides

```ts
const child = parent.createChild([
  [RequestId, { useValue: generateId() }],
  [User, { useValue: currentUser }],
]);

const requestId = child.get(RequestId);
const user = child.get(User);
```

### Scoped Execution

Run code in an isolated scope with automatic cleanup:

```ts
await container.runInScope(
  async (scope) => {
    const handler = scope.get(RequestHandler);
    const result = await handler.process(data);
    return result;
  },
  [
    [RequestId, { useValue: generateId() }],
    [User, { useValue: currentUser }],
  ],
);
// Scope is automatically cleaned up
```

### Request-Scoped Dependencies

Perfect for web servers:

```ts
app.use(async (req, res) => {
  await container.runInScope(
    async (scope) => {
      // Register request-specific dependencies
      scope.registerValue(Request, req);
      scope.registerValue(Response, res);

      // Resolve and execute handler
      const handler = scope.get(RequestHandler);
      await handler.handle();
    },
    [[RequestId, { useValue: req.id }]],
  );
});
```

## Testing

### Test Containers

Create isolated containers for testing:

```ts
import { createTestContainer } from '@vielzeug/wireit';

describe('UserService', () => {
  const { container, dispose } = createTestContainer(baseContainer);

  afterEach(() => {
    dispose(); // Clean up after each test
  });

  it('should create user', async () => {
    const service = container.get(UserService);
    const user = await service.createUser({ name: 'Test User' });
    expect(user.name).toBe('Test User');
  });
});
```

### Mocking Dependencies

Use `withMock` to temporarily replace dependencies:

```ts
import { withMock } from '@vielzeug/wireit';

it('should handle database error', async () => {
  const mockDb = {
    users: {
      create: vi.fn().mockRejectedValue(new Error('DB Error')),
    },
  };

  await withMock(container, Database, mockDb, async () => {
    const service = container.get(UserService);
    await expect(service.createUser(userData)).rejects.toThrow('DB Error');
  });

  // Original database is automatically restored
});
```

### Testing with Different Configurations

```ts
describe('UserService with mock logger', () => {
  it('should log user creation', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    const { container, dispose } = createTestContainer();
    container.registerValue(Logger, mockLogger);
    container.register(UserService, {
      useClass: UserService,
      deps: [Database, Logger],
    });

    const service = container.get(UserService);
    await service.createUser({ name: 'Test' });

    expect(mockLogger.info).toHaveBeenCalledWith('Creating user');

    dispose();
  });
});
```

## Best Practices

### ✅ Do

- **Use descriptive token names** for easier debugging
- **Use interfaces** for token types to allow swapping implementations
- **Register singletons** for expensive resources (database, connections)
- **Use scoped lifetimes** for request-specific data
- **Leverage parent/child** containers for isolation
- **Use `createTestContainer`** in tests for automatic cleanup
- **Create tokens in a central file** for consistency

### ❌ Don't

- **Don't create circular dependencies** - refactor your design
- **Don't use `get()` with async providers** - use `getAsync()`
- **Don't mutate container** during resolution
- **Don't register too many transient services** - prefer singletons
- **Don't use `any` types** - leverage TypeScript inference
- **Don't access private container internals** - use public API

### Code Organization

```ts
// tokens.ts
export const Database = createToken<IDatabase>('Database');
export const Logger = createToken<ILogger>('Logger');
export const UserService = createToken<IUserService>('UserService');

// container.ts
import * as Tokens from './tokens';

export const container = createContainer();

container
  .register(Tokens.Database, { useClass: PrismaDatabase })
  .register(Tokens.Logger, { useClass: ConsoleLogger })
  .register(Tokens.UserService, {
    useClass: UserService,
    deps: [Tokens.Database, Tokens.Logger],
  });

// app.ts
import { container } from './container';
import * as Tokens from './tokens';

const service = container.get(Tokens.UserService);
```

### Avoid Common Pitfalls

```ts
// ❌ Circular dependency
container.register(ServiceA, { useClass: A, deps: [ServiceB] });
container.register(ServiceB, { useClass: B, deps: [ServiceA] });

// ✅ Break the cycle with shared dependency
container.register(Shared, { useClass: SharedService });
container.register(ServiceA, { useClass: A, deps: [Shared] });
container.register(ServiceB, { useClass: B, deps: [Shared] });

// ❌ Async provider with sync resolution
container.registerFactory(DB, async () => db, [], { async: true });
const db = container.get(DB); // Error!

// ✅ Use getAsync
const db = await container.getAsync(DB);

// ❌ Registering during resolution
container.registerFactory(Service, () => {
  container.register(AnotherService, ...); // Don't do this!
  return new Service();
});

// ✅ Register all dependencies first
container.register(AnotherService, ...);
container.registerFactory(Service, () => new Service());
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> - Complete API documentation</li>
      <li><a href="./examples">Examples</a> - Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> - Try it in your browser</li>
    </ul>
  </div>
</div>
