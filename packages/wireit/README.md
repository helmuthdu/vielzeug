# Wireit

**Lightweight, type-safe dependency injection for TypeScript**

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/@vielzeug/wireit)
[![Bundle Size](https://img.shields.io/badge/size-~3KB-success)](https://bundlephobia.com/package/@vielzeug/wireit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Simple, powerful dependency injection container with full TypeScript support, zero dependencies, and IoC principles.

## ✨ Features

- 🎯 **Type-Safe** - Full TypeScript inference for tokens and dependencies
- 🪶 **Lightweight** - ~2.2KB gzipped, zero dependencies
- 🔄 **Lifetimes** - Singleton, Transient, and Scoped support
- ⚡ **Async Support** - Handle async factories and dependencies
- 🌳 **Hierarchical** - Parent/child containers with inheritance
- 🧪 **Testing Friendly** - Built-in mocking and testing utilities
- 🔗 **Token Aliasing** - Create aliases for flexible provider management
- 🚀 **Production Ready** - Comprehensive test coverage

## 📦 Installation

```bash
# pnpm
pnpm add @vielzeug/wireit

# npm
npm install @vielzeug/wireit

# yarn
yarn add @vielzeug/wireit
```

## Quick Start

```typescript
import { createContainer, createToken } from '@vielzeug/wireit';

// 1. Define tokens
const Database = createToken<DatabaseService>('Database');
const UserRepo = createToken<UserRepository>('UserRepository');
const UserService = createToken<UserService>('UserService');

// 2. Create container and register providers
const container = createContainer();

container
  .registerValue(Database, new PrismaDatabase())
  .register(UserRepo, {
    useClass: UserRepositoryImpl,
    deps: [Database],
    lifetime: 'singleton',
  })
  .register(UserService, {
    useClass: UserServiceImpl,
    deps: [UserRepo],
  });

// 3. Resolve dependencies
const userService = container.get(UserService);
await userService.createUser({ name: 'Alice' });
```

## Core Concepts

### Tokens

Tokens are typed symbols that identify dependencies:

```typescript
const Logger = createToken<ILogger>('Logger');
const Config = createToken<AppConfig>('Config');
const Cache = createToken<CacheService>('Cache');
```

### Providers

Three types of providers for different use cases:

#### Value Provider

Register a plain value or existing instance:

```typescript
const config = { apiUrl: 'https://api.example.com', timeout: 5000 };
container.registerValue(Config, config);
```

#### Class Provider

Register a class to be instantiated:

```typescript
container.register(Logger, {
  useClass: ConsoleLogger,
  deps: [Config],
  lifetime: 'singleton', // default
});
```

#### Factory Provider

Register a factory function:

```typescript
container.registerFactory(
  Cache,
  (config) => new RedisCache(config.redisUrl),
  [Config],
  { lifetime: 'singleton' }
);
```

### Lifetimes

Control when instances are created:

```typescript
// Singleton - Created once, reused everywhere (default for classes)
container.register(Database, {
  useClass: PrismaDatabase,
  lifetime: 'singleton',
});

// Transient - Created every time (default for factories)
container.registerFactory(RequestId, () => generateId(), [], {
  lifetime: 'transient',
});

// Scoped - Created once per scope (e.g., per request)
container.register(RequestContext, {
  useClass: Context,
  lifetime: 'scoped',
});
```

## 🔥 Advanced Usage

### Async Factories

Handle async initialization:

```typescript
container.registerFactory(
  Database,
  async (config) => {
    const db = new PrismaClient();
    await db.$connect();
    return db;
  },
  [Config],
  { async: true, lifetime: 'singleton' }
);

// Use getAsync for async resolution
const db = await container.getAsync(Database);
```

### Parent/Child Containers

Create isolated scopes:

```typescript
const rootContainer = createContainer();
rootContainer.registerValue(Config, globalConfig);

// Child inherits from parent
const requestContainer = rootContainer.createChild([
  [RequestId, { useValue: generateId() }],
  [User, { useValue: currentUser }],
]);

// Child can override parent registrations
requestContainer.registerValue(Config, requestSpecificConfig);
```

### Scoped Execution

Run code in an isolated scope with automatic cleanup:

```typescript
app.use(async (req, res) => {
  await container.runInScope(
    async (scope) => {
      const handler = scope.get(RequestHandler);
      await handler.process(req, res);
    },
    [
      [RequestId, { useValue: req.id }],
      [User, { useValue: req.user }],
    ]
  );
  // Scope is automatically cleaned up
});
```

### Token Aliasing

Create flexible provider relationships:

```typescript
const IUserService = createToken<IUserService>('IUserService');
const UserServiceImpl = createToken<UserServiceImpl>('UserServiceImpl');

container.register(UserServiceImpl, {
  useClass: UserServiceImpl,
  deps: [Database],
});

// Alias interface to implementation
container.alias(UserServiceImpl, IUserService);

// Both work
const service1 = container.get(UserServiceImpl);
const service2 = container.get(IUserService); // Same instance
```

### Optional Dependencies

Handle missing dependencies gracefully:

```typescript
// Returns undefined if not registered
const logger = container.getOptional(Logger);

// Or use allowOptional option
const container = createContainer({ allowOptional: true });
const missing = container.get(SomeToken); // undefined instead of error
```

## 🧪 Testing

### Test Containers

Create isolated containers for testing:

```typescript
import { createTestContainer } from '@vielzeug/wireit';

describe('UserService', () => {
  const { container, dispose } = createTestContainer(baseContainer);

  afterEach(() => dispose());

  it('should create user', async () => {
    const service = container.get(UserService);
    const user = await service.createUser({ name: 'Test' });
    expect(user.name).toBe('Test');
  });
});
```

### Mocking Dependencies

Temporarily replace dependencies:

```typescript
import { withMock } from '@vielzeug/wireit';

it('should handle database error', async () => {
  const mockDb = { save: vi.fn().mockRejectedValue(new Error('DB Error')) };

  await withMock(container, Database, mockDb, async () => {
    const service = container.get(UserService);
    await expect(service.createUser(data)).rejects.toThrow('DB Error');
  });

  // Original database is restored after withMock
});
```

## 🎯 Real-World Example

```typescript
import { createContainer, createToken } from '@vielzeug/wireit';

// Tokens
const Config = createToken<AppConfig>('Config');
const Logger = createToken<ILogger>('Logger');
const Database = createToken<IDatabase>('Database');
const UserRepo = createToken<IUserRepository>('UserRepository');
const UserService = createToken<IUserService>('UserService');
const EmailService = createToken<IEmailService>('EmailService');

// Setup
const container = createContainer();

// Configuration
container.registerValue(Config, {
  apiUrl: process.env.API_URL,
  dbUrl: process.env.DATABASE_URL,
  logLevel: 'info',
});

// Infrastructure
container.registerFactory(
  Logger,
  (config) => new ConsoleLogger(config.logLevel),
  [Config],
  { lifetime: 'singleton' }
);

container.registerFactory(
  Database,
  async (config) => {
    const db = new PrismaClient({ datasourceUrl: config.dbUrl });
    await db.$connect();
    return db;
  },
  [Config],
  { async: true, lifetime: 'singleton' }
);

// Repositories
container.register(UserRepo, {
  useClass: UserRepository,
  deps: [Database, Logger],
  lifetime: 'singleton',
});

// Services
container.register(UserService, {
  useClass: UserService,
  deps: [UserRepo, EmailService, Logger],
});

container.register(EmailService, {
  useClass: SendGridEmailService,
  deps: [Config, Logger],
});

// Usage in Express
app.post('/users', async (req, res) => {
  await container.runInScope(
    async (scope) => {
      const service = scope.get(UserService);
      const user = await service.createUser(req.body);
      res.json(user);
    },
    [[RequestId, { useValue: req.id }]]
  );
});
```

## 📚 API Reference

### Container Methods

| Method | Description |
|--------|-------------|
| `register(token, provider)` | Register a provider for a token |
| `registerValue(token, value, lifetime?)` | Register a plain value |
| `registerFactory(token, factory, deps?, options?)` | Register a factory function |
| `registerMany(providers)` | Register multiple providers at once |
| `get(token)` | Resolve a dependency synchronously |
| `getAsync(token)` | Resolve a dependency asynchronously |
| `getOptional(token)` | Resolve or return undefined |
| `getOptionalAsync(token)` | Async resolve or return undefined |
| `alias(source, alias)` | Create an alias for a token |
| `has(token)` | Check if token is registered |
| `unregister(token)` | Remove a registration |
| `clear()` | Clear all registrations |
| `createChild(overrides?)` | Create a child container |
| `runInScope(fn, overrides?)` | Run function in isolated scope |
| `debug()` | Get debug information |

### Factory Functions

| Function | Description |
|----------|-------------|
| `createToken(description?)` | Create a typed token |
| `createContainer(options?)` | Create a new container |
| `createTestContainer(base?)` | Create a test container |
| `withMock(container, token, mock, fn)` | Temporarily mock a dependency |

### Error Classes

| Error | When Thrown |
|-------|-------------|
| `ProviderNotFoundError` | Token not registered |
| `AsyncProviderError` | Async provider used with sync get() |
| `CircularDependencyError` | Circular dependency detected |

## 🔍 How It Works

Wireit uses TypeScript symbols as tokens to uniquely identify dependencies. The container maintains a registry of providers and resolves dependencies by:

1. **Token Resolution** - Resolves aliases to source tokens
2. **Circular Detection** - Tracks dependency stack to prevent cycles
3. **Provider Execution** - Instantiates classes or calls factories
4. **Instance Caching** - Caches singletons for reuse
5. **Parent Delegation** - Falls back to parent container if not found

## 🆚 Comparison

| Feature | Wireit | InversifyJS | TSyringe |
|---------|--------|-------------|----------|
| Bundle Size | ~3KB | ~14KB | ~7KB |
| Dependencies | 0 | 1 | 2 |
| Decorators | ❌ | ✅ | ✅ |
| Async Support | ✅ | ✅ | ❌ |
| Scoped Lifetimes | ✅ | ✅ | ✅ |
| Testing Helpers | ✅ | ❌ | ❌ |
| TypeScript First | ✅ | ✅ | ✅ |

## 💡 Best Practices

### ✅ Do

- Use descriptive token names for debugging
- Register singletons for expensive resources
- Use scoped lifetimes for request-specific data
- Leverage parent/child containers for isolation
- Use `createTestContainer` in tests

### ❌ Don't

- Don't create circular dependencies
- Don't use `get()` with async providers
- Don't mutate container during resolution
- Don't register too many transient services

## 🤝 Contributing

Contributions are welcome! Please check out our [Contributing Guide](../../.github/contributing.md).

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Links

- [Documentation](https://helmuthdu.github.io/vielzeug/wireit/)
- [GitHub](https://github.com/helmuthdu/vielzeug)
- [NPM](https://www.npmjs.com/package/@vielzeug/wireit)
- [Issues](https://github.com/helmuthdu/vielzeug/issues)

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/helmuthdu">Helmuth Saatkamp</a></sub>
</div>

